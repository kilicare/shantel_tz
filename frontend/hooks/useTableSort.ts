"use client";

import { useCallback, useState } from "react";

type SortDirection = "asc" | "desc" | null;

export function useTableSort() {
  const [sort, setSort] = useState<{ column: string | null; direction: SortDirection }>({ column: null, direction: null });
  const handleSort = useCallback((column: string) => setSort((current) => current.column !== column ? { column, direction: "asc" } : current.direction === "asc" ? { column, direction: "desc" } : { column: null, direction: null }), []);
  return { sort, handleSort, isSorted: (column: string) => sort.column === column, getSortDirection: (column: string) => sort.column === column ? sort.direction : null };
}
