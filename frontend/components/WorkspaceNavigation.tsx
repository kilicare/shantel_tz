"use client";

import Link from "next/link";
import { ArrowRightLeft, BarChart3, Boxes, ClipboardCheck, FileText, LayoutDashboard, LogOut, PackageSearch, ReceiptText, Settings, ShoppingCart, SlidersHorizontal, Store, Tags, Users, WalletCards } from "lucide-react";
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

  const canSee = (required: string[]) => required.some((permission) => permissions.includes(permission));
  const logout = () => {
    localStorage.removeItem("shantel_access_token");
    localStorage.removeItem("shantel_refresh_token");
    localStorage.removeItem("shantel_user");
    router.replace("/login");
  };

  return (
    <aside className="border-b border-[#17221f]/12 bg-[#17221f] text-[#f4f1ec]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 py-4 sm:px-10">
        <Link href="/dashboard" className="mr-3 text-sm font-semibold tracking-[0.2em] text-[#e8a36b]">SHANTEL</Link>
        <nav aria-label="Workspace navigation" className="flex min-w-0 flex-1 flex-wrap gap-1">
          {navigation.filter((item) => canSee(item.required)).map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={pathname.startsWith(href) ? "page" : undefined} className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${pathname.startsWith(href) ? "bg-[#e8a36b] text-[#17221f]" : "text-[#f4f1ec]/65 hover:bg-[#263631] hover:text-[#f4f1ec]"}`}>
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-right">
          <span className="hidden text-[10px] uppercase tracking-[0.12em] text-[#f4f1ec]/50 sm:inline">{userLabel}</span>
          <button type="button" onClick={logout} aria-label="Log out" className="flex items-center gap-2 border border-[#f4f1ec]/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] hover:bg-[#263631]"><LogOut size={15} /> Logout</button>
        </div>
      </div>
    </aside>
  );
}
