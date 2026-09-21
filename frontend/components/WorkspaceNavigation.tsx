"use client";

import Link from "next/link";
import { ArrowRightLeft, BarChart3, Boxes, Briefcase, ChevronDown, ChevronRight, ClipboardCheck, FileText, LayoutDashboard, LoaderCircle, LogOut, Menu, PackageSearch, PanelLeftClose, PanelLeftOpen, ReceiptText, Settings, ShoppingCart, SlidersHorizontal, Store, Tags, Users, WalletCards, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRef } from "react";
import { apiClient } from "@/lib/api-client";
import { ThemeToggle } from "@/components/ThemeToggle";

type NavigationItem = {
  href: string;
  label: string;
  required: string[];
  icon: typeof LayoutDashboard;
  children?: NavigationItem[];
};

const navigation: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", required: ["dashboard.view"], icon: LayoutDashboard },
  { 
    href: "/sales", 
    label: "Sales", 
    required: ["quotations.view", "sales_orders.view", "invoices.view"], 
    icon: ShoppingCart,
    children: [
      { href: "/sales/quotations", label: "Quotations", required: ["quotations.view"], icon: FileText },
      { href: "/sales/orders", label: "Sales orders", required: ["sales_orders.view"], icon: ShoppingCart },
    ]
  },
  { 
    href: "/invoices", 
    label: "Invoices", 
    required: ["invoices.view"], 
    icon: FileText,
    children: [
      { href: "/invoices/new", label: "New invoice", required: ["invoices.create"], icon: FileText },
    ]
  },
  { 
    href: "/inventory", 
    label: "Inventory", 
    required: ["inventory.view"], 
    icon: Boxes,
    children: [
      { href: "/inventory/transfers", label: "Transfers", required: ["inventory.view"], icon: ArrowRightLeft },
      { href: "/inventory/adjustments", label: "Adjustments", required: ["inventory.view"], icon: SlidersHorizontal },
      { href: "/inventory/audits", label: "Stock audits", required: ["inventory.view"], icon: ClipboardCheck },
    ]
  },
  { 
    href: "/products", 
    label: "Products", 
    required: ["products.view"], 
    icon: Tags,
    children: [
      { href: "/products/master-data", label: "Product master", required: ["products.view"], icon: Tags },
    ]
  },
  { href: "/locations", label: "Locations", required: ["locations.view"], icon: Store },
  { 
    href: "/purchasing", 
    label: "Purchasing", 
    required: ["purchase_orders.view", "grns.view"], 
    icon: PackageSearch,
    children: [
      { href: "/purchasing/orders", label: "Purchase orders", required: ["purchase_orders.view"], icon: PackageSearch },
      { href: "/purchasing/requisitions", label: "Requisitions", required: ["purchase_orders.view"], icon: PackageSearch },
      { href: "/purchasing/returns", label: "Purchase returns", required: ["purchase_returns.view"], icon: ReceiptText },
    ]
  },
  { href: "/customers", label: "Customers", required: ["customers.view"], icon: Users },
  { href: "/projects", label: "Projects", required: ["projects.view"], icon: Briefcase },
  { href: "/assets", label: "Assets", required: ["assets.view"], icon: PackageSearch },
  { href: "/serial-numbers", label: "Serial numbers", required: ["serial_numbers.view"], icon: PackageSearch },
  { href: "/suppliers", label: "Suppliers", required: ["suppliers.view"], icon: Store },
  { 
    href: "/payments", 
    label: "Payments", 
    required: ["payments.view"], 
    icon: WalletCards,
    children: [
      { href: "/payments/refunds", label: "Refunds", required: ["payments.view"], icon: WalletCards },
    ]
  },
  { href: "/expenses", label: "Expenses", required: ["expenses.view"], icon: WalletCards },
  { href: "/approvals", label: "Approvals", required: ["approvals.view"], icon: ClipboardCheck },
  { href: "/returns", label: "Returns", required: ["sales_returns.view", "purchase_returns.view"], icon: ReceiptText },
  { href: "/audit", label: "Audit", required: ["audit.view"], icon: ReceiptText },
  { href: "/reports", label: "Reports", required: ["reports.view"], icon: BarChart3, children: [
    { href: "/reports/sales", label: "Sales report", required: ["reports.view"], icon: BarChart3 },
    { href: "/reports/customers", label: "Customer report", required: ["reports.view"], icon: Users },
    { href: "/reports/products", label: "Product report", required: ["reports.view"], icon: Tags },
    { href: "/reports/purchasing", label: "Purchasing report", required: ["reports.view"], icon: PackageSearch },
    { href: "/reports/suppliers", label: "Supplier balance", required: ["reports.view"], icon: Store },
    { href: "/reports/payments", label: "Payment report", required: ["reports.view"], icon: WalletCards },
    { href: "/reports/expenses", label: "Expense report", required: ["reports.view"], icon: WalletCards },
    { href: "/reports/audit", label: "Audit report", required: ["audit.view"], icon: ReceiptText },
  ] },
  { href: "/settings", label: "Settings", required: ["documents.configure"], icon: Settings },
];

const routePermissions: Record<string, string[]> = (() => {
  const permissions: Record<string, string[]> = {};
  const collectPermissions = (items: NavigationItem[]) => {
    items.forEach((item) => {
      permissions[item.href] = item.required;
      if (item.children) {
        collectPermissions(item.children);
      }
    });
  };
  collectPermissions(navigation);
  return permissions;
})();

export function WorkspaceNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [userLabel, setUserLabel] = useState("Workspace");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const profileDialogRef = useRef<HTMLDivElement>(null);
  const profileReturnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      const user = JSON.parse(sessionStorage.getItem("shantel_user") ?? "null");
      setPermissions(user?.permissions ?? []);
      setUserLabel(user?.roles?.join(" / ") || user?.name || "Workspace");
      setAvatarUrl(user?.avatarUrl ?? null);
    } catch {
      setPermissions([]);
    } finally {
      setPermissionsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!permissionsLoaded) return;
    const required = routePermissions[pathname] ?? Object.entries(routePermissions)
      .filter(([route]) => pathname.startsWith(`${route}/`))
      .sort(([left], [right]) => right.length - left.length)[0]?.[1];
    if (required && !required.some((permission) => permissions.includes(permission))) {
      router.replace("/dashboard");
    }
  }, [pathname, permissions, permissionsLoaded, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!profileOpen) return;
    profileReturnFocusRef.current = document.activeElement as HTMLElement | null;
    profileDialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      profileReturnFocusRef.current?.focus();
    };
  }, [profileOpen]);

  useEffect(() => {
    const autoExpand = (items: NavigationItem[]) => {
      items.forEach((item) => {
        if (item.children) {
          const hasActiveChild = item.children.some((child) => pathname === child.href || pathname.startsWith(child.href));
          if (hasActiveChild) {
            setExpandedItems((prev) => new Set([...prev, item.href]));
          }
          autoExpand(item.children);
        }
      });
    };
    autoExpand(navigation);
  }, [pathname]);

  const canSee = (required: string[]) => required.some((permission) => permissions.includes(permission));
  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };
  const filterNavigation = (items: NavigationItem[]): NavigationItem[] => {
    return items
      .map((item) => {
        const canSeeParent = canSee(item.required);
        const filteredChildren = item.children ? filterNavigation(item.children) : undefined;
        const hasVisibleChildren = filteredChildren && filteredChildren.length > 0;
        
        if (canSeeParent || hasVisibleChildren) {
          return {
            ...item,
            children: filteredChildren,
          };
        }
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  };
  const visibleNavigation = filterNavigation(navigation);
  const logout = () => {
    sessionStorage.removeItem("shantel_access_token");
    sessionStorage.removeItem("shantel_refresh_token");
    sessionStorage.removeItem("shantel_user");
    localStorage.removeItem("shantel_access_token");
    localStorage.removeItem("shantel_refresh_token");
    localStorage.removeItem("shantel_user");
    router.replace("/login");
  };

  const updateAvatar = async (file?: File) => {
    if (!file) return;
    try {
      setAvatarUploading(true);
      setAvatarError("");
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiClient.post("/users/me/avatar", formData, { headers: { "Content-Type": undefined } });
      const updatedUser = response.data?.data ?? response.data;
      const currentUser = JSON.parse(sessionStorage.getItem("shantel_user") ?? "{}");
      const nextUser = { ...currentUser, ...updatedUser };
      sessionStorage.setItem("shantel_user", JSON.stringify(nextUser));
      setAvatarUrl(updatedUser.avatarUrl ?? null);
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setAvatarError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Profile picture could not be updated.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const avatar = avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : <span className="text-body font-semibold">{userLabel.charAt(0).toUpperCase()}</span>;

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.href);
    const active = pathname === item.href || (hasChildren && pathname.startsWith(item.href));

    if (hasChildren) {
      return (
        <div key={item.href}>
          <div className="flex items-center gap-1">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={desktopCollapsed ? item.label : undefined}
              className={`flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-body font-semibold transition-colors ${desktopCollapsed ? "justify-center" : ""} ${active ? "bg-brand-primary text-primary-foreground shadow-elevation-1" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"}`}
            >
              <item.icon size={18} />
              {!desktopCollapsed && <span className="flex-1 text-left">{item.label}</span>}
            </Link>
            {!desktopCollapsed && (
              <button
                type="button"
                onClick={() => toggleExpanded(item.href)}
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.label}`}
                className={`flex items-center justify-center rounded-md p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary`}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}
          </div>
          {isExpanded && !desktopCollapsed && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children?.map((child) => renderNavigationItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        title={desktopCollapsed ? item.label : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-body font-semibold transition-colors ${desktopCollapsed ? "justify-center" : ""} ${active ? "bg-brand-primary text-primary-foreground shadow-elevation-1" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"}`}
      >
        <item.icon size={18} />
        {!desktopCollapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  const renderMobileNavigationItem = (item: NavigationItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.href);
    const active = pathname === item.href || (hasChildren && pathname.startsWith(item.href));

    if (hasChildren) {
      return (
        <div key={item.href}>
          <div className="flex items-center gap-1">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 items-center gap-3 rounded-md px-3 py-2.5 text-body font-semibold uppercase tracking-wide ${active ? "bg-blue-primary text-white" : "text-primary-foreground/70 hover:bg-brand-primary-hover hover:text-primary-foreground"}`}
            >
              <item.icon size={16} />
              <span className="flex-1 text-left">{item.label}</span>
            </Link>
            <button
              type="button"
              onClick={() => toggleExpanded(item.href)}
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.label}`}
              className={`flex items-center justify-center rounded-md p-2 text-primary-foreground/70 hover:bg-brand-primary-hover hover:text-primary-foreground`}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children?.map((child) => renderMobileNavigationItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-body font-semibold uppercase tracking-wide ${active ? "bg-blue-primary text-white" : "text-primary-foreground/70 hover:bg-brand-primary-hover hover:text-primary-foreground"}`}
      >
        <item.icon size={16} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className={`workspace-navigation-shell ${desktopCollapsed ? "workspace-collapsed" : "workspace-expanded"}`}>
      <aside className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border-subtle bg-surface text-text-primary shadow-elevation-1 transition-[width] duration-200 md:flex ${desktopCollapsed ? "w-[76px]" : "w-64"}`}>
        <div className={`flex h-20 items-center border-b border-border-subtle ${desktopCollapsed ? "justify-center px-3" : "justify-between px-5"}`}>
          <Link href="/dashboard" className={`flex items-center gap-3 text-body font-semibold tracking-wide text-brand-primary ${desktopCollapsed ? "justify-center" : ""}`} title="SHANTEL dashboard">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-body text-brand-amber">S</span>
            {!desktopCollapsed && <span>SHANTEL</span>}
          </Link>
          {!desktopCollapsed && <button type="button" onClick={() => setDesktopCollapsed(true)} aria-label="Collapse navigation" className="rounded-md p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"><PanelLeftClose size={18} /></button>}
        </div>

        <nav aria-label="Workspace navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {visibleNavigation.map((item) => renderNavigationItem(item))}
        </nav>

        <div className={`border-t border-border-subtle p-3 ${desktopCollapsed ? "flex flex-col items-center gap-2" : ""}`}>
          {desktopCollapsed && <button type="button" onClick={() => setDesktopCollapsed(false)} aria-label="Expand navigation" className="rounded-md p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"><PanelLeftOpen size={18} /></button>}
          <button type="button" onClick={logout} aria-label="Log out" title="Log out" className={`flex w-full items-center gap-2 rounded-lg border border-border-subtle px-3 py-2.5 text-label font-semibold text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary ${desktopCollapsed ? "justify-center" : ""}`}><LogOut size={16} />{!desktopCollapsed && "Logout"}</button>
        </div>
      </aside>

      <div aria-hidden="true" className={`hidden shrink-0 md:block transition-[width] duration-200 ${desktopCollapsed ? "w-[76px]" : "w-64"}`} />

      <header className={`workspace-desktop-header fixed top-0 right-0 z-30 hidden h-20 items-center justify-end border-b border-border-subtle bg-background/95 px-6 backdrop-blur transition-[left] duration-200 lg:px-8 md:flex ${desktopCollapsed ? "left-[76px]" : "left-64"}`}>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button type="button" onClick={() => setProfileOpen(true)} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-2.5 py-2 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-primary/25" title="Open profile" aria-label="Open profile">
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-primary text-brand-amber ring-2 ring-brand-amber/40">{avatarUploading ? <LoaderCircle size={16} className="animate-spin" /> : avatar}</span>
            <span className="hidden min-w-0 sm:block"><span className="block max-w-48 truncate text-label font-semibold text-text-primary">{userLabel}</span><span className="block text-caption text-text-muted">Profile & picture</span></span>
            <ChevronDown size={16} className="text-text-muted" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="border-b border-border-subtle bg-brand-primary text-primary-foreground md:hidden">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="shrink-0 text-body font-semibold tracking-wide text-brand-amber">SHANTEL</Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <button type="button" onClick={() => setProfileOpen(true)} aria-label="Open profile" title="Open profile" className="flex size-11 items-center justify-center overflow-hidden rounded-full bg-surface text-brand-primary ring-2 ring-brand-amber/60">{avatarUploading ? <LoaderCircle size={16} className="animate-spin" /> : avatar}</button>
            <button type="button" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileMenuOpen} className="inline-flex items-center gap-2 rounded-md border border-border-subtle px-3 py-2 text-label font-semibold uppercase tracking-wide text-primary-foreground hover:bg-brand-primary-hover">{mobileMenuOpen ? <X size={16} /> : <Menu size={16} />} Menu</button>
          </div>
        </div>
        {mobileMenuOpen && <nav aria-label="Mobile workspace navigation" className="flex flex-col gap-1 border-t border-border-subtle px-4 py-3 sm:px-6">{visibleNavigation.map((item) => renderMobileNavigationItem(item))}<div className="mt-2 flex items-center justify-between gap-3 border-t border-border-subtle pt-3"><button type="button" onClick={() => setProfileOpen(true)} className="flex min-w-0 items-center gap-2 text-left"><span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-label text-brand-primary">{avatar}</span><span className="truncate text-label uppercase tracking-wide text-primary-foreground/70">{userLabel}</span></button><button type="button" onClick={logout} className="flex shrink-0 items-center gap-2 border border-border-subtle px-3 py-2 text-label font-semibold uppercase tracking-wide hover:bg-brand-primary-hover"><LogOut size={16} /> Logout</button></div></nav>}
      </div>
      <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { void updateAvatar(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      {profileOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setProfileOpen(false); }}>
        <div ref={profileDialogRef} tabIndex={-1} className="max-h-[calc(100vh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-border-default bg-surface p-6 text-text-primary shadow-elevation-3 outline-none sm:p-7" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-caption font-semibold uppercase tracking-wide text-blue-primary">Your account</p><h2 id="profile-dialog-title" className="mt-2 text-h3 font-semibold">Profile picture</h2><p className="mt-1 text-body text-text-muted">This picture appears in your workspace navigation.</p></div>
            <button type="button" onClick={() => setProfileOpen(false)} aria-label="Close profile" className="rounded-md p-2 text-text-muted hover:bg-surface-hover hover:text-text-primary"><X size={18} /></button>
          </div>
          <div className="mt-6 flex flex-col items-center">
            <span className="flex size-28 items-center justify-center overflow-hidden rounded-full border-4 border-brand-amber/60 bg-brand-primary text-h2 text-brand-amber shadow-elevation-2">{avatarUploading ? <LoaderCircle size={28} className="animate-spin" /> : avatar}</span>
            <p className="mt-4 text-body font-semibold">{userLabel}</p>
            <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading} className="mt-5 w-full rounded-md border border-brand-amber bg-brand-primary px-4 py-3 text-label font-semibold uppercase tracking-wide text-primary-foreground shadow-elevation-1 hover:bg-brand-primary-hover disabled:opacity-60">{avatarUploading ? "Uploading..." : "Choose profile picture"}</button>
            <p className="mt-3 text-center text-caption text-text-muted">JPG, PNG, or WebP. Maximum 2 MB.</p>
            {avatarError && <p role="alert" className="mt-3 text-center text-caption text-danger">{avatarError}</p>}
          </div>
        </div>
      </div>}
    </div>
  );
}
