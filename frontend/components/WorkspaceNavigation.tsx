"use client";

import Link from "next/link";
import { ArrowRightLeft, BarChart3, Boxes, ClipboardCheck, FileText, LayoutDashboard, LoaderCircle, LogOut, Menu, PackageSearch, PanelLeftClose, PanelLeftOpen, ReceiptText, Settings, ShoppingCart, SlidersHorizontal, Store, Tags, Users, WalletCards, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRef } from "react";
import { apiClient } from "@/lib/api-client";

type NavigationItem = {
  href: string;
  label: string;
  required: string[];
  icon: typeof LayoutDashboard;
};

const navigation: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", required: ["dashboard.view"], icon: LayoutDashboard },
  { href: "/sales", label: "Sales", required: ["quotations.view", "sales_orders.view", "invoices.view"], icon: ShoppingCart },
  { href: "/invoices", label: "Invoices", required: ["invoices.view"], icon: FileText },
  { href: "/inventory", label: "Inventory", required: ["inventory.view"], icon: Boxes },
  { href: "/inventory/transfers", label: "Transfers", required: ["inventory.view"], icon: ArrowRightLeft },
  { href: "/inventory/adjustments", label: "Adjustments", required: ["inventory.view"], icon: SlidersHorizontal },
  { href: "/inventory/audits", label: "Stock audits", required: ["inventory.view"], icon: ClipboardCheck },
  { href: "/products", label: "Products", required: ["products.view"], icon: Tags },
  { href: "/products/master-data", label: "Product master", required: ["products.view"], icon: Tags },
  { href: "/locations", label: "Locations", required: ["locations.view"], icon: Store },
  { href: "/purchasing", label: "Purchasing", required: ["purchase_orders.view", "grns.view"], icon: PackageSearch },
  { href: "/customers", label: "Customers", required: ["customers.view"], icon: Users },
  { href: "/suppliers", label: "Suppliers", required: ["suppliers.view"], icon: Store },
  { href: "/payments", label: "Payments", required: ["payments.view"], icon: WalletCards },
  { href: "/expenses", label: "Expenses", required: ["expenses.view"], icon: WalletCards },
  { href: "/approvals", label: "Approvals", required: ["approvals.view"], icon: ClipboardCheck },
  { href: "/returns", label: "Returns", required: ["sales_returns.view", "purchase_returns.view"], icon: ReceiptText },
  { href: "/audit", label: "Audit", required: ["audit.view"], icon: ReceiptText },
  { href: "/reports", label: "Reports", required: ["reports.view"], icon: BarChart3 },
  { href: "/settings", label: "Settings", required: ["documents.configure"], icon: Settings },
];

const routePermissions: Record<string, string[]> = Object.fromEntries(
  navigation.map((item) => [item.href, item.required]),
);

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

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("shantel_user") ?? "null");
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
    const required = routePermissions[pathname];
    if (required && !required.some((permission) => permissions.includes(permission))) {
      router.replace("/dashboard");
    }
  }, [pathname, permissions, permissionsLoaded, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const canSee = (required: string[]) => required.some((permission) => permissions.includes(permission));
  const visibleNavigation = navigation.filter((item) => canSee(item.required));
  const logout = () => {
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
      const currentUser = JSON.parse(localStorage.getItem("shantel_user") ?? "{}");
      const nextUser = { ...currentUser, ...updatedUser };
      localStorage.setItem("shantel_user", JSON.stringify(nextUser));
      setAvatarUrl(updatedUser.avatarUrl ?? null);
    } catch (requestError: any) {
      const apiMessage = requestError?.response?.data?.message;
      setAvatarError(Array.isArray(apiMessage) ? apiMessage[0] : apiMessage || "Profile picture could not be updated.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const avatar = avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : <span className="text-sm font-semibold">{userLabel.charAt(0).toUpperCase()}</span>;

  return (
    <div className={`workspace-navigation-shell ${desktopCollapsed ? "workspace-collapsed" : "workspace-expanded"}`}>
      <aside className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border-default bg-surface-card text-text-primary shadow-[8px_0_30px_rgba(23,34,31,0.04)] transition-[width] duration-200 md:flex ${desktopCollapsed ? "w-[76px]" : "w-64"}`}>
        <div className={`flex h-20 items-center border-b border-border-subtle ${desktopCollapsed ? "justify-center px-3" : "justify-between px-5"}`}>
          <Link href="/dashboard" className={`flex items-center gap-3 text-sm font-semibold tracking-[0.2em] text-brand-forest ${desktopCollapsed ? "justify-center" : ""}`} title="SHANTEL dashboard">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-forest text-sm text-brand-amber">S</span>
            {!desktopCollapsed && <span>SHANTEL</span>}
          </Link>
          {!desktopCollapsed && <button type="button" onClick={() => setDesktopCollapsed(true)} aria-label="Collapse navigation" className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary"><PanelLeftClose size={17} /></button>}
        </div>

        <nav aria-label="Workspace navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {visibleNavigation.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} title={desktopCollapsed ? label : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-semibold transition-colors ${desktopCollapsed ? "justify-center" : ""} ${active ? "bg-brand-forest text-text-inverse shadow-sm" : "text-text-secondary hover:bg-surface-muted hover:text-text-primary"}`}><Icon size={17} />{!desktopCollapsed && <span>{label}</span>}</Link>;
          })}
        </nav>

        <div className={`border-t border-border-subtle p-3 ${desktopCollapsed ? "flex flex-col items-center gap-2" : ""}`}>
          {!desktopCollapsed && <button type="button" onClick={() => setProfileOpen(true)} className="mb-3 flex w-full items-center gap-3 rounded-xl px-2 py-1 text-left hover:bg-surface-muted" title="Open profile"><span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-forest text-brand-amber ring-2 ring-brand-amber/40">{avatarUploading ? <LoaderCircle size={16} className="animate-spin" /> : avatar}</span><span className="min-w-0"><span className="block truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">{userLabel}</span><span className="block text-[10px] text-text-muted/70">Profile & picture</span></span></button>}
          {desktopCollapsed && <><button type="button" onClick={() => setProfileOpen(true)} aria-label="Open profile" title="Open profile" className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-brand-forest text-brand-amber ring-2 ring-brand-amber/40">{avatarUploading ? <LoaderCircle size={16} className="animate-spin" /> : avatar}</button><button type="button" onClick={() => setDesktopCollapsed(false)} aria-label="Expand navigation" className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary"><PanelLeftOpen size={17} /></button></>}
          <button type="button" onClick={logout} aria-label="Log out" title="Log out" className={`flex w-full items-center gap-2 rounded-xl border border-border-default px-3 py-2.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary ${desktopCollapsed ? "justify-center" : ""}`}><LogOut size={16} />{!desktopCollapsed && "Logout"}</button>
        </div>
      </aside>

      <div aria-hidden="true" className={`hidden shrink-0 md:block transition-[width] duration-200 ${desktopCollapsed ? "w-[76px]" : "w-64"}`} />

      <div className="border-b border-border-inverse bg-brand-forest text-text-inverse md:hidden">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="shrink-0 text-sm font-semibold tracking-[0.2em] text-brand-amber">SHANTEL</Link>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => setProfileOpen(true)} aria-label="Open profile" title="Open profile" className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-brand-paper text-brand-forest ring-2 ring-brand-amber/60">{avatarUploading ? <LoaderCircle size={16} className="animate-spin" /> : avatar}</button>
            <button type="button" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileMenuOpen} className="inline-flex items-center gap-2 rounded-md border border-border-inverse px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-inverse hover:bg-interactive-primary-hover">{mobileMenuOpen ? <X size={15} /> : <Menu size={15} />} Menu</button>
          </div>
        </div>
        {mobileMenuOpen && <nav aria-label="Mobile workspace navigation" className="flex flex-col gap-1 border-t border-border-inverse px-4 py-3 sm:px-6">{visibleNavigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname.startsWith(href) ? "page" : undefined} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] ${pathname.startsWith(href) ? "bg-interactive-active text-brand-forest" : "text-text-inverse/70 hover:bg-interactive-primary-hover hover:text-text-inverse"}`}><Icon size={15} />{label}</Link>)}<div className="mt-2 flex items-center justify-between gap-3 border-t border-border-inverse pt-3"><button type="button" onClick={() => setProfileOpen(true)} className="flex min-w-0 items-center gap-2 text-left"><span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-paper text-xs text-brand-forest">{avatar}</span><span className="truncate text-[10px] uppercase tracking-[0.12em] text-text-inverse/70">{userLabel}</span></button><button type="button" onClick={logout} className="flex shrink-0 items-center gap-2 border border-border-inverse px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] hover:bg-interactive-primary-hover"><LogOut size={15} /> Logout</button></div></nav>}
      </div>
      <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { void updateAvatar(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      {profileOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-forest/55 px-4" role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title">
        <div className="w-full max-w-sm bg-surface-card p-6 text-text-primary shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-interactive-active">Your account</p><h2 id="profile-dialog-title" className="mt-2 text-xl font-semibold">Profile picture</h2><p className="mt-1 text-sm text-text-muted">This picture appears in your workspace navigation.</p></div>
            <button type="button" onClick={() => setProfileOpen(false)} aria-label="Close profile" className="rounded-lg p-2 text-text-muted hover:bg-surface-muted hover:text-text-primary"><X size={18} /></button>
          </div>
          <div className="mt-6 flex flex-col items-center">
            <span className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-brand-forest text-3xl text-brand-amber ring-4 ring-brand-amber/30">{avatarUploading ? <LoaderCircle size={28} className="animate-spin" /> : avatar}</span>
            <p className="mt-4 text-sm font-semibold">{userLabel}</p>
            <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading} className="mt-5 w-full bg-interactive-primary px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-text-inverse hover:bg-interactive-primary-hover disabled:opacity-60">{avatarUploading ? "Uploading..." : "Choose profile picture"}</button>
            <p className="mt-3 text-center text-[11px] text-text-muted">JPG, PNG, or WebP. Maximum 2 MB.</p>
            {avatarError && <p role="alert" className="mt-3 text-center text-xs text-status-danger-text">{avatarError}</p>}
          </div>
        </div>
      </div>}
    </div>
  );
}
