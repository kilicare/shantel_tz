"use client";

import Link from "next/link";
import { ArrowRightLeft, BarChart3, Boxes, ClipboardCheck, FileText, LayoutDashboard, LogOut, Menu, PackageSearch, PanelLeftClose, PanelLeftOpen, ReceiptText, Settings, ShoppingCart, SlidersHorizontal, Store, Tags, Users, WalletCards, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("shantel_user") ?? "null");
      setPermissions(user?.permissions ?? []);
      setUserLabel(user?.roles?.join(" / ") || user?.name || "Workspace");
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
          {!desktopCollapsed && <p className="truncate px-2 pb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">{userLabel}</p>}
          {desktopCollapsed && <button type="button" onClick={() => setDesktopCollapsed(false)} aria-label="Expand navigation" className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-muted hover:text-text-primary"><PanelLeftOpen size={17} /></button>}
          <button type="button" onClick={logout} aria-label="Log out" title="Log out" className={`flex w-full items-center gap-2 rounded-xl border border-border-default px-3 py-2.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary ${desktopCollapsed ? "justify-center" : ""}`}><LogOut size={16} />{!desktopCollapsed && "Logout"}</button>
        </div>
      </aside>

      <div aria-hidden="true" className={`hidden shrink-0 md:block transition-[width] duration-200 ${desktopCollapsed ? "w-[76px]" : "w-64"}`} />

      <div className="border-b border-border-inverse bg-brand-forest text-text-inverse md:hidden">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="shrink-0 text-sm font-semibold tracking-[0.2em] text-brand-amber">SHANTEL</Link>
          <button type="button" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileMenuOpen} className="ml-auto inline-flex items-center gap-2 rounded-md border border-border-inverse px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-inverse hover:bg-interactive-primary-hover">{mobileMenuOpen ? <X size={15} /> : <Menu size={15} />} Menu</button>
        </div>
        {mobileMenuOpen && <nav aria-label="Mobile workspace navigation" className="flex flex-col gap-1 border-t border-border-inverse px-4 py-3 sm:px-6">{visibleNavigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname.startsWith(href) ? "page" : undefined} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] ${pathname.startsWith(href) ? "bg-interactive-active text-brand-forest" : "text-text-inverse/70 hover:bg-interactive-primary-hover hover:text-text-inverse"}`}><Icon size={15} />{label}</Link>)}<div className="mt-2 flex items-center justify-between gap-3 border-t border-border-inverse pt-3"><span className="text-[10px] uppercase tracking-[0.12em] text-text-inverse/50">{userLabel}</span><button type="button" onClick={logout} className="flex items-center gap-2 border border-border-inverse px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] hover:bg-interactive-primary-hover"><LogOut size={15} /> Logout</button></div></nav>}
      </div>
    </div>
  );
}
