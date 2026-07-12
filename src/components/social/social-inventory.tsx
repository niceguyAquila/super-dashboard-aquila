"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import {
  addSocialSignal,
  bulkImportSocialSignals,
  deleteSocialSignal,
  updateSocialSignal,
} from "@/lib/actions/social";
import type { Brand, BrandSocialSignal } from "@/lib/types";
import { formatNumber } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TablePagination,
  usePagination,
} from "@/components/ui/table-pagination";
import { SortableHead, useSort } from "@/components/ui/sortable-table";

type SignalSortKey = "label" | "url" | "updated";
type MetricSortKey = "label" | "count" | "updated";

type LabelMetric = {
  label: string;
  count: number;
  lastUpdatedAt: string;
};

function signalTouchedAt(signal: BrandSocialSignal) {
  return signal.updated_at || signal.created_at;
}

function buildLabelMetrics(signals: BrandSocialSignal[]): LabelMetric[] {
  const map = new Map<string, LabelMetric>();

  for (const signal of signals) {
    const key = signal.label.trim() || "Untitled";
    const touched = signalTouchedAt(signal);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { label: key, count: 1, lastUpdatedAt: touched });
      continue;
    }
    existing.count += 1;
    if (new Date(touched).getTime() > new Date(existing.lastUpdatedAt).getTime()) {
      existing.lastUpdatedAt = touched;
    }
  }

  return [...map.values()];
}

function signalSortValue(row: BrandSocialSignal, key: SignalSortKey) {
  if (key === "label") return row.label.toLowerCase();
  if (key === "url") return row.url.toLowerCase();
  return new Date(signalTouchedAt(row)).getTime();
}

function metricSortValue(row: LabelMetric, key: MetricSortKey) {
  if (key === "label") return row.label.toLowerCase();
  if (key === "count") return row.count;
  return new Date(row.lastUpdatedAt).getTime();
}

function formatRelative(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

export function SocialInventory({
  brand,
  signals,
}: {
  brand: Brand;
  signals: BrandSocialSignal[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [signalLabel, setSignalLabel] = useState("");
  const [signalUrl, setSignalUrl] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [editSignal, setEditSignal] = useState<BrandSocialSignal | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [deleteSignal, setDeleteSignal] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const bulkLineCount = bulkText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#")).length;

  const filteredSignals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return signals;
    return signals.filter(
      (signal) =>
        signal.label.toLowerCase().includes(q) ||
        signal.url.toLowerCase().includes(q),
    );
  }, [signals, searchQuery]);

  const labelMetrics = useMemo(
    () => buildLabelMetrics(filteredSignals),
    [filteredSignals],
  );

  const getMetricSortValue = useCallback(metricSortValue, []);
  const {
    sorted: sortedMetrics,
    sortKey: metricSortKey,
    sortDir: metricSortDir,
    toggleSort: toggleMetricSort,
  } = useSort<LabelMetric, MetricSortKey>(
    labelMetrics,
    "count",
    "desc",
    getMetricSortValue,
    {
      defaultDirForKey: (key) => (key === "label" ? "asc" : "desc"),
    },
  );
  const metricsPagination = usePagination(sortedMetrics);

  const getSignalSortValue = useCallback(signalSortValue, []);
  const {
    sorted: sortedSignals,
    sortKey: signalSortKey,
    sortDir: signalSortDir,
    toggleSort: toggleSignalSort,
  } = useSort<BrandSocialSignal, SignalSortKey>(
    filteredSignals,
    "label",
    "asc",
    getSignalSortValue,
    {
      defaultDirForKey: (key) => (key === "updated" ? "desc" : "asc"),
    },
  );
  const pagination = usePagination(sortedSignals);

  function onSearchChange(value: string) {
    setSearchQuery(value);
    metricsPagination.setPage(1);
    pagination.setPage(1);
  }

  function toggleMetricSortAndReset(key: MetricSortKey) {
    toggleMetricSort(key);
    metricsPagination.setPage(1);
  }

  function toggleSignalSortAndReset(key: SignalSortKey) {
    toggleSignalSort(key);
    pagination.setPage(1);
  }

  function openEdit(signal: BrandSocialSignal) {
    setEditSignal(signal);
    setEditLabel(signal.label);
    setEditUrl(signal.url);
  }

  function addSignal(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("brandId", brand.id);
    fd.set("brandSlug", brand.slug);
    fd.set("label", signalLabel);
    fd.set("url", signalUrl);
    startTransition(async () => {
      const result = await addSocialSignal(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Social signal added");
        setSignalLabel("");
        setSignalUrl("");
        router.refresh();
      }
    });
  }

  function importBulk(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("brandId", brand.id);
    fd.set("brandSlug", brand.slug);
    fd.set("bulkText", bulkText);
    startTransition(async () => {
      const result = await bulkImportSocialSignals(fd);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Imported ${result.imported} social signal${result.imported === 1 ? "" : "s"}`,
      );
      setBulkText("");
      setBulkOpen(false);
      router.refresh();
    });
  }

  function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editSignal) return;
    const fd = new FormData();
    fd.set("id", editSignal.id);
    fd.set("brandSlug", brand.slug);
    fd.set("label", editLabel);
    fd.set("url", editUrl);
    startTransition(async () => {
      const result = await updateSocialSignal(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Social signal updated");
        setEditSignal(null);
        router.refresh();
      }
    });
  }

  function removeSignal() {
    if (!deleteSignal) return;
    const fd = new FormData();
    fd.set("id", deleteSignal.id);
    fd.set("brandSlug", brand.slug);
    startTransition(async () => {
      const result = await deleteSocialSignal(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Removed");
        setDeleteSignal(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Social inventory</h1>
          <p className="page-subtitle">
            Track social profile and signal links for {brand.name}.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search label or URL…"
              className="pl-8"
              aria-label="Search social signals"
            />
          </div>
          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger
              render={
                <Button variant="outline">
                  <Upload className="size-3.5" />
                  Bulk import
                </Button>
              }
            />
            <DialogContent className="flex max-h-[min(90vh,720px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
              <DialogHeader className="shrink-0 space-y-2 border-b px-4 py-4 pr-12">
                <DialogTitle>Bulk import social signals</DialogTitle>
                <DialogDescription>
                  One entry per line. Supported formats:{" "}
                  <code className="text-xs">Label,URL</code>,{" "}
                  <code className="text-xs">Label | URL</code>, or a bare URL.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={importBulk}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="min-h-0 flex-1 overflow-hidden px-4 py-4">
                  <Textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    className="field-sizing-fixed h-[min(50vh,360px)] max-h-[min(50vh,360px)] min-h-[160px] resize-none overflow-y-auto font-mono text-[0.8125rem] leading-relaxed"
                    placeholder={`Twitter,https://x.com/brand\nTelegram | https://t.me/brand\nhttps://facebook.com/brand`}
                    required
                  />
                </div>
                <div className="flex shrink-0 flex-col gap-3 border-t bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {bulkLineCount} line{bulkLineCount === 1 ? "" : "s"} ready
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setBulkText("");
                        setBulkOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={pending || bulkLineCount === 0}
                    >
                      {pending ? "Importing…" : "Import links"}
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Label metrics</CardTitle>
          <CardDescription>
            {labelMetrics.length} label
            {labelMetrics.length === 1 ? "" : "s"} ·{" "}
            {signals.length} link{signals.length === 1 ? "" : "s"} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {labelMetrics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {searchQuery.trim()
                ? "No labels match your search."
                : "No labels yet. Add links below to see counts and last updated dates."}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead
                      label="Label"
                      sortKey="label"
                      activeKey={metricSortKey}
                      dir={metricSortDir}
                      onSort={toggleMetricSortAndReset}
                    />
                    <SortableHead
                      label="Links"
                      sortKey="count"
                      activeKey={metricSortKey}
                      dir={metricSortDir}
                      onSort={toggleMetricSortAndReset}
                    />
                    <SortableHead
                      label="Last updated"
                      sortKey="updated"
                      activeKey={metricSortKey}
                      dir={metricSortDir}
                      onSort={toggleMetricSortAndReset}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metricsPagination.pageItems.map((metric) => (
                    <TableRow key={metric.label}>
                      <TableCell>
                        <Badge variant="secondary">{metric.label}</Badge>
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(metric.count)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRelative(metric.lastUpdatedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                id="label-metrics-page-size"
                page={metricsPagination.page}
                pageSize={metricsPagination.pageSize}
                totalPages={metricsPagination.totalPages}
                from={metricsPagination.from}
                to={metricsPagination.to}
                total={metricsPagination.total}
                onPageChange={metricsPagination.setPage}
                onPageSizeChange={metricsPagination.setPageSize}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social signals</CardTitle>
          <CardDescription>
            {signals.length} link{signals.length === 1 ? "" : "s"} for this
            brand · click a column header to sort
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={addSignal}
            className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto]"
          >
            <Input
              placeholder="Label (Twitter, TG…)"
              value={signalLabel}
              onChange={(e) => setSignalLabel(e.target.value)}
              required
            />
            <Input
              placeholder="https://…"
              value={signalUrl}
              onChange={(e) => setSignalUrl(e.target.value)}
              required
            />
            <Button type="submit" disabled={pending}>
              <Plus className="size-3.5" />
              Add
            </Button>
          </form>

          {filteredSignals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {searchQuery.trim()
                ? "No social signals match your search."
                : "No social signal links yet. Add your first link above."}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead
                      label="Label"
                      sortKey="label"
                      activeKey={signalSortKey}
                      dir={signalSortDir}
                      onSort={toggleSignalSortAndReset}
                    />
                    <SortableHead
                      label="URL"
                      sortKey="url"
                      activeKey={signalSortKey}
                      dir={signalSortDir}
                      onSort={toggleSignalSortAndReset}
                    />
                    <SortableHead
                      label="Last updated"
                      sortKey="updated"
                      activeKey={signalSortKey}
                      dir={signalSortDir}
                      onSort={toggleSignalSortAndReset}
                    />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.pageItems.map((signal) => (
                    <TableRow key={signal.id}>
                      <TableCell>
                        <Badge variant="secondary">{signal.label}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        <a
                          href={signal.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-800 hover:underline"
                        >
                          <span className="truncate">{signal.url}</span>
                          <ExternalLink className="size-3 shrink-0" />
                        </a>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRelative(signalTouchedAt(signal))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-0.5">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => openEdit(signal)}
                            disabled={pending}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() =>
                              setDeleteSignal({
                                id: signal.id,
                                label: signal.label,
                              })
                            }
                            disabled={pending}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                id="signals-page-size"
                page={pagination.page}
                pageSize={pagination.pageSize}
                totalPages={pagination.totalPages}
                from={pagination.from}
                to={pagination.to}
                total={pagination.total}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!editSignal}
        onOpenChange={(open) => {
          if (!open) setEditSignal(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit social signal</DialogTitle>
            <DialogDescription>
              Updating a link refreshes its last updated time.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-label">Label</Label>
              <Input
                id="edit-label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-url">URL</Label>
              <Input
                id="edit-url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={pending} className="w-full">
              Save changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteSignal}
        onOpenChange={(open) => {
          if (!open) setDeleteSignal(null);
        }}
        title="Delete social signal?"
        description={`This will remove the “${deleteSignal?.label ?? ""}” link from this brand.`}
        pending={pending}
        onConfirm={removeSignal}
      />
    </div>
  );
}
