"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableHead } from "@/components/ui/table";

export type SortDir = "asc" | "desc";

export function compareSortValues(
  av: string | number | boolean | null | undefined,
  bv: string | number | boolean | null | undefined,
): number {
  if (typeof av === "number" && typeof bv === "number") return av - bv;
  if (typeof av === "boolean" && typeof bv === "boolean") {
    return Number(av) - Number(bv);
  }
  return String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function useSort<TItem, TKey extends string>(
  items: TItem[],
  initialKey: TKey,
  initialDir: SortDir,
  getValue: (item: TItem, key: TKey) => string | number | boolean | null | undefined,
  options?: {
    defaultDirForKey?: (key: TKey) => SortDir;
  },
) {
  const [sortKey, setSortKey] = useState<TKey>(initialKey);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);

  const sorted = useMemo(() => {
    const rows = [...items];
    rows.sort((a, b) => {
      const cmp = compareSortValues(getValue(a, sortKey), getValue(b, sortKey));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [items, sortKey, sortDir, getValue]);

  function toggleSort(key: TKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(options?.defaultDirForKey?.(key) ?? "asc");
    }
  }

  return { sorted, sortKey, sortDir, toggleSort };
}

export function SortableHead<TKey extends string>({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: TKey;
  activeKey: TKey;
  dir: SortDir;
  onSort: (key: TKey) => void;
  className?: string;
}) {
  const active = activeKey === sortKey;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead className={className}>
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
        onClick={() => onSort(sortKey)}
      >
        {label}
        <Icon className="size-3.5 opacity-70" />
      </button>
    </TableHead>
  );
}
