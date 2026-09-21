"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, Search } from "lucide-react";
import { usePagination } from "@/hooks/usePagination";
import { useTableSort } from "@/hooks/useTableSort";
import { Button } from "@/components/ui/button";

type Column<T> = { key: keyof T; label: string; sortable?: boolean; visible?: boolean; render?: (value: any, row: T) => React.ReactNode; width?: string };
export function DataTable<T extends { id?: string }>({ columns, data, searchFields = [], onRowClick, pageSize = 10, exportable, onExport }: { columns: Column<T>[]; data: T[]; searchFields?: (keyof T | string)[]; onRowClick?: (row: T) => void; pageSize?: number; exportable?: boolean; onExport?: () => void }) {
  const [query, setQuery] = useState("");
  const { sort, handleSort } = useTableSort();
  const pagination = usePagination(pageSize);
  const visibleColumns = columns.filter((column) => column.visible !== false);
  const filtered = useMemo(() => data.filter((row) => !query.trim() || searchFields.some((field) => String(field).split(".").reduce<any>((value, part) => value?.[part], row)?.toLowerCase?.().includes(query.toLowerCase()) ?? false)).sort((a, b) => {
    if (!sort.column || !sort.direction) return 0;
    const left = String(a[sort.column as keyof T] ?? ""); const right = String(b[sort.column as keyof T] ?? "");
    return left.localeCompare(right, undefined, { numeric: true }) * (sort.direction === "asc" ? 1 : -1);
  }), [data, query, searchFields, sort]);
  useEffect(() => {
    pagination.setTotal(filtered.length);
    if (pagination.page > Math.max(1, Math.ceil(filtered.length / pagination.limit))) pagination.setPage(1);
  }, [filtered.length, pagination.limit, pagination.page, pagination.setPage, pagination.setTotal]);
  const rows = filtered.slice(pagination.skip, pagination.skip + pagination.limit);
  return <section className="min-w-0 space-y-3">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <label className="relative flex-1 sm:max-w-sm">
        <span className="sr-only">Search records</span>
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-text-muted" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records" className="h-11 w-full rounded-md border border-border-subtle bg-surface pl-9 pr-3 text-body text-text-primary outline-none ring-0 transition-colors placeholder:text-text-muted focus:border-blue-primary focus:ring-2 focus:ring-blue-primary/25" />
      </label>
      {exportable && onExport ? (
        <Button variant="secondary" onClick={onExport} className="w-full sm:w-auto">
          <Download className="size-4" /> Export
        </Button>
      ) : null}
    </div>

    <div className="min-w-0 max-w-full overflow-x-auto rounded-lg border border-border-subtle bg-surface shadow-elevation-1">
      <table className="w-full min-w-[700px] text-body" aria-label="Records">
        <thead className="border-b border-border-subtle bg-surface-muted text-left">
          <tr>
            {visibleColumns.map((column) => (
              <th key={String(column.key)} aria-sort={sort.column === column.key ? (sort.direction === "asc" ? "ascending" : "descending") : column.sortable ? "none" : undefined} className={`px-3 py-3 font-semibold text-text-secondary sm:px-4 ${column.width ?? ""}`}>
                {column.sortable ? (
                  <button type="button" className="inline-flex items-center gap-1 tracking-tight" onClick={() => handleSort(String(column.key))}>
                    {column.label}
                    {sort.column === column.key && (sort.direction === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />)}
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={row.id ?? index} onClick={() => onRowClick?.(row)} onKeyDown={(event) => { if (onRowClick && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onRowClick(row); } }} tabIndex={onRowClick ? 0 : undefined} aria-label={onRowClick ? `Open record ${row.id ?? index + 1}` : undefined} className={`border-b border-border-subtle last:border-0 ${onRowClick ? "cursor-pointer hover:bg-surface-hover focus-visible:bg-surface-hover" : ""}`}>
              {visibleColumns.map((column) => (
                <td key={String(column.key)} className={`px-3 py-3 align-middle text-text-secondary sm:px-4 ${/amount|total|balance|price|cost|paid|revenue|outstanding/i.test(column.label) ? "money-positive" : ""}`}>
                  {column.render ? column.render(row[column.key], row) : String(row[column.key] ?? "-")}
                </td>
              ))}
            </tr>
          )) : (
            <tr>
              <td colSpan={visibleColumns.length} className="px-4 py-12 text-center text-text-muted">No records found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    <div className="flex flex-col gap-2 text-small text-text-muted sm:flex-row sm:items-center sm:justify-between sm:text-body">
      <span>{filtered.length ? `${pagination.skip + 1}-${Math.min(pagination.skip + pagination.limit, filtered.length)}` : "0"} of {filtered.length}</span>
      <div className="flex flex-wrap items-center gap-2">
        <select value={pagination.limit} onChange={(event) => pagination.setLimit(Number(event.target.value))} className="h-11 rounded-md border border-border-subtle bg-surface px-3 text-small text-text-primary sm:text-body focus:border-blue-primary focus:outline-none focus:ring-2 focus:ring-blue-primary/25">
          <option value="10">10 / page</option>
          <option value="25">25 / page</option>
          <option value="50">50 / page</option>
        </select>
        <Button variant="secondary" size="small" disabled={!pagination.hasPrevPage} onClick={() => pagination.setPage(pagination.page - 1)}>Previous</Button>
        <span>Page {pagination.page} / {pagination.totalPages}</span>
        <Button variant="secondary" size="small" disabled={!pagination.hasNextPage} onClick={() => pagination.setPage(pagination.page + 1)}>Next</Button>
      </div>
    </div>
  </section>;
}
