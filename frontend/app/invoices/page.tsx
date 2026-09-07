"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, FilePlus2, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/DataTable";
import { ErrorAlert } from "@/components/ErrorAlert";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useAsyncData } from "@/hooks/useAsyncData";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { apiClient } from "@/lib/api-client";
import { WorkspaceNavigation } from "@/components/WorkspaceNavigation";
import { StatusBadge } from "@/components/ShantelPrimitives";

type Invoice = { id: string; invoiceNumber: string; customer?: { name: string }; invoiceDate: string; totalAmount: number | string; balance: number | string; status: string };
export default function InvoicesPage() {
  const router = useRouter();
  const [permissions, setPermissions] = useState<string[]>([]);
  async function openAuthenticatedDocument(path: string, fileName?: string) {
    const response = await apiClient.get(path, { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    if (fileName) {
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    window.open(url, "_blank");
  }
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("shantel_user") ?? "null");
      setPermissions(user?.permissions ?? []);
    } catch {
      setPermissions([]);
    }
  }, []);
  const canCreate = permissions.includes("invoices.create");
  const canExport = permissions.includes("reports.export");
  const loader = useCallback(async () => {
    const response = await apiClient.get("/sales/invoices?page=1&limit=100");
    const payload = response.data;
    return (payload?.data?.data ?? payload?.data ?? payload ?? []) as Invoice[];
  }, []);
  const { data, loading, error, refetch } = useAsyncData({ loader });
  const invoices = data ?? [];
  const columns = [
    { key: "invoiceNumber" as const, label: "Invoice", sortable: true },
    { key: "customer" as const, label: "Customer", render: (value: Invoice["customer"]) => value?.name ?? "Walk-in customer" },
    { key: "invoiceDate" as const, label: "Date", sortable: true, render: (value: string) => formatDate(value) },
    { key: "totalAmount" as const, label: "Total", render: (value: number | string) => formatCurrency(value) },
    { key: "balance" as const, label: "Balance", render: (value: number | string) => formatCurrency(value) },
    { key: "status" as const, label: "Status", render: (value: string) => <StatusBadge status={value} /> },
    { key: "id" as const, label: "Actions", render: (_: string, row: Invoice) => <div className="flex gap-1"><Button variant="ghost" size="icon-sm" aria-label="View invoice" onClick={(event) => { event.stopPropagation(); router.push(`/invoices/${row.id}`); }}><Eye /></Button><Button variant="ghost" size="icon-sm" aria-label="Print invoice" onClick={(event) => { event.stopPropagation(); void openAuthenticatedDocument(`/documents/invoices/${row.id}/print-pdf`); }}><Printer /></Button></div> },
  ];
  const currentYear = new Date().getFullYear();
  return <><WorkspaceNavigation /><div className="mx-auto w-full min-w-0 max-w-7xl space-y-5 px-4 py-5 sm:px-6 sm:py-8 lg:px-8"><header className="flex flex-col gap-4 border-b border-[#172B4D]/10 pb-5 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#2563EB]">Sales desk</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#172B4D] sm:text-3xl">Invoices</h1><p className="mt-2 text-sm text-[#172B4D]/55">Search, inspect and print customer invoices.</p></div>{canCreate ? <Button onClick={() => router.push("/invoices/new")} className="w-full sm:w-auto"><FilePlus2 className="size-4" /> New invoice</Button> : null}</header><ErrorAlert error={error?.message ?? null} onDismiss={() => void refetch()} />{loading ? <LoadingSpinner message="Loading invoices" /> : <div className="rounded-2xl border border-[#172B4D]/10 bg-white p-2 shadow-sm sm:p-3"><DataTable columns={columns} data={invoices} searchFields={["invoiceNumber", "customer.name", "status"]} onRowClick={(row) => router.push(`/invoices/${row.id}`)} exportable={canExport} onExport={() => { void openAuthenticatedDocument(`/reports/export/sales-excel?startDate=${currentYear}-01-01&endDate=${currentYear}-12-31`, "sales-invoices.xlsx"); }} /></div>}</div></>;
}
