"use client";

import { useCallback, useState } from "react";

export function usePagination(initialLimit = 10) {
  const [state, setState] = useState({ page: 1, limit: initialLimit, total: 0 });
  const setPage = useCallback((page: number) => setState((prev) => ({ ...prev, page: Math.max(1, page) })), []);
  const setLimit = useCallback((limit: number) => setState((prev) => ({ ...prev, limit, page: 1 })), []);
  const setTotal = useCallback((total: number) => setState((prev) => ({ ...prev, total })), []);
  const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
  return { ...state, setPage, setLimit, setTotal, totalPages, hasNextPage: state.page < totalPages, hasPrevPage: state.page > 1, skip: (state.page - 1) * state.limit };
}
