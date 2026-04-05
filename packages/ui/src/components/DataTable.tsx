"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "../lib/utils";
import { Input } from "./Input";
import { Button } from "./Button";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface DataTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  className?: string;
  emptyMessage?: string;
}

type SortDir = "asc" | "desc" | null;

/**
 * Sortable, searchable, paginated data table.
 */
function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = "Search...",
  pageSize = 10,
  className,
  emptyMessage = "No results found.",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q)),
    );
  }, [data, search]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  function handleSort(key: string) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
      setSortDir(null);
    }
    setPage(1);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function SortIcon({ col }: { col: Column<T> }) {
    const key = col.key as string;
    if (!col.sortable) return null;
    if (sortKey !== key) return <ChevronsUpDown className="h-3.5 w-3.5 text-neutral-400" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-3.5 w-3.5 text-primary" />
      : <ChevronDown className="h-3.5 w-3.5 text-primary" />;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {searchable && (
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-neutral-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                {columns.map((col) => (
                  <th
                    key={col.key as string}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500",
                      col.sortable && "cursor-pointer select-none hover:text-neutral-700",
                      col.className,
                    )}
                    onClick={() => col.sortable && handleSort(col.key as string)}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.header}
                      <SortIcon col={col} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-sm text-neutral-400"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginated.map((row, i) => (
                  <tr key={i} className="hover:bg-neutral-50 transition-colors">
                    {columns.map((col) => {
                      const key = col.key as string;
                      const value = row[key];
                      return (
                        <td
                          key={key}
                          className={cn("px-4 py-3 text-neutral-700", col.className)}
                        >
                          {col.render ? col.render(value, row) : String(value ?? "")}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-neutral-500">
          <span>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of{" "}
            {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[4rem] text-center">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { DataTable };
