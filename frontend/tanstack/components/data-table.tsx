import { type ReactNode } from "react";
import { Download, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { exportCsv } from "@/lib/csv-export";

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  filename?: string;
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<T extends Record<string, unknown>>({
  data, columns, isLoading, emptyMessage = "Aucune donnée",
  filename, page, totalPages, total, onPageChange,
}: DataTableProps<T>) {
  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {filename && data.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => exportCsv(data, columns.map((c) => ({ key: c.key, label: c.label })), filename)}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted transition"
          >
            <Download className="h-3.5 w-3.5" /> Exporter CSV
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                {columns.map((col) => (
                  <th key={String(col.key)} className="p-3 text-left">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={columns.length} className="p-6 text-center text-muted-foreground">{emptyMessage}</td></tr>
              ) : (
                data.map((row, i) => (
                  <tr key={String(row.id ?? i)} className="border-t border-border hover:bg-muted/30">
                    {columns.map((col) => (
                      <td key={String(col.key)} className="p-3">
                        {col.render ? col.render(row) : String(row[col.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {total !== undefined && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{data.length} / {total} résultat(s)</span>
          {page !== undefined && totalPages !== undefined && totalPages > 1 && onPageChange && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="rounded border border-border p-1.5 disabled:opacity-30 hover:bg-muted"
              ><ChevronLeft className="h-3.5 w-3.5" /></button>
              <span className="font-medium">{page} / {totalPages}</span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="rounded border border-border p-1.5 disabled:opacity-30 hover:bg-muted"
              ><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
