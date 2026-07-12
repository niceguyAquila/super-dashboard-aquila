"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import {
  bulkImportDomains,
  createDomain,
  deleteDomain,
  revalidateDomainsView,
} from "@/lib/actions/domains";
import type { Brand } from "@/lib/types";
import { formatNumber } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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

type DomainRow = {
  id: string;
  hostname: string;
  title: string | null;
  ahrefs_last_synced_at: string | null;
  ahrefs_sync_error: string | null;
  domain_ahrefs_metrics:
    | {
        domain_rating: number | null;
        backlinks: number | null;
        refdomains: number | null;
      }
    | {
        domain_rating: number | null;
        backlinks: number | null;
        refdomains: number | null;
      }[]
    | null;
  domain_social_signals: { id: string }[];
};

type SortKey =
  | "hostname"
  | "title"
  | "dr"
  | "backlinks"
  | "refdomains"
  | "social"
  | "synced";

function metricsOf(row: DomainRow) {
  const m = row.domain_ahrefs_metrics;
  if (!m) return null;
  return Array.isArray(m) ? m[0] ?? null : m;
}

function domainSortValue(row: DomainRow, key: SortKey): string | number {
  const metrics = metricsOf(row);
  switch (key) {
    case "hostname":
      return row.hostname.toLowerCase();
    case "title":
      return (row.title ?? "").toLowerCase();
    case "dr":
      return Number(metrics?.domain_rating ?? -1);
    case "backlinks":
      return Number(metrics?.backlinks ?? -1);
    case "refdomains":
      return Number(metrics?.refdomains ?? -1);
    case "social":
      return row.domain_social_signals?.length ?? 0;
    case "synced":
      return row.ahrefs_last_synced_at
        ? new Date(row.ahrefs_last_synced_at).getTime()
        : 0;
    default:
      return "";
  }
}

export function DomainsInventory({
  brand,
  domains,
}: {
  brand: Brand;
  domains: DomainRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);
  const [hostname, setHostname] = useState("");
  const [title, setTitle] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    hostname: string;
  } | null>(null);

  const bulkLineCount = bulkText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#")).length;

  const getDomainSortValue = useCallback(domainSortValue, []);
  const {
    sorted: sortedDomains,
    sortKey,
    sortDir,
    toggleSort: toggleDomainSort,
  } = useSort<DomainRow, SortKey>(domains, "hostname", "asc", getDomainSortValue, {
    defaultDirForKey: (key) =>
      key === "hostname" || key === "title" ? "asc" : "desc",
  });

  const pagination = usePagination(sortedDomains);

  function toggleSort(key: SortKey) {
    toggleDomainSort(key);
    pagination.setPage(1);
  }

  async function refreshInventory() {
    await revalidateDomainsView(brand.slug);
    router.refresh();
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("brandId", brand.id);
    fd.set("brandSlug", brand.slug);
    fd.set("hostname", hostname);
    fd.set("title", title);
    startTransition(async () => {
      const result = await createDomain(fd);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Domain added");
      setHostname("");
      setTitle("");
      setOpen(false);
      await refreshInventory();
    });
  }

  function onBulkImport(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("brandId", brand.id);
    fd.set("brandSlug", brand.slug);
    fd.set("bulkText", bulkText);
    startTransition(async () => {
      const result = await bulkImportDomains(fd);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const imported = result.imported ?? 0;
      const skipped = result.skipped ?? 0;
      if (imported === 0 && skipped > 0) {
        toast.message(`No new domains — ${skipped} already existed`);
      } else {
        toast.success(
          `Imported ${imported} domain${imported === 1 ? "" : "s"}${
            skipped ? ` (${skipped} skipped)` : ""
          }`,
        );
      }
      setBulkText("");
      setBulkOpen(false);
      await refreshInventory();
    });
  }

  async function syncAll() {
    setSyncing(true);
    try {
      const res = await fetch("/api/ahrefs/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: brand.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Sync failed");
      } else if (json.failed > 0) {
        const firstError =
          json.results?.find(
            (r: { ok: boolean; error?: string }) => !r.ok,
          )?.error ?? "Unknown Ahrefs error";
        toast.error(
          `Sync failed for ${json.failed}/${json.synced}: ${firstError}`,
          { duration: 12000 },
        );
      } else {
        toast.success(
          `Synced ${json.synced} domain${json.synced === 1 ? "" : "s"}`,
        );
      }
      await refreshInventory();
    } catch {
      toast.error("Sync request failed");
    } finally {
      setSyncing(false);
    }
  }

  function removeDomain() {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    const fd = new FormData();
    fd.set("id", id);
    fd.set("brandSlug", brand.slug);
    startTransition(async () => {
      const result = await deleteDomain(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Domain deleted");
        setDeleteTarget(null);
        await refreshInventory();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Domain inventory</h1>
          <p className="page-subtitle">
            Track titles, social signals, and Ahrefs metrics for {brand.name}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={syncAll}
            disabled={syncing || domains.length === 0}
          >
            <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
            Sync Ahrefs
          </Button>
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
                <DialogTitle>Bulk import domains</DialogTitle>
                <DialogDescription>
                  One domain per line. Formats:{" "}
                  <code className="text-xs">example.com</code>,{" "}
                  <code className="text-xs">example.com,Title</code>, or{" "}
                  <code className="text-xs">example.com | Title</code>. Existing
                  domains are skipped.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={onBulkImport}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="min-h-0 flex-1 overflow-hidden px-4 py-4">
                  <Textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    className="field-sizing-fixed h-[min(50vh,360px)] max-h-[min(50vh,360px)] min-h-[160px] resize-none overflow-y-auto font-mono text-[0.8125rem] leading-relaxed"
                    placeholder={
                      "dzinetrip.com,ZENPLAY168\nexample.com\nanother-site.com | Main Title"
                    }
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
                      {pending ? "Importing…" : `Import ${bulkLineCount || ""}`}
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button>
                  <Plus className="size-3.5" />
                  Add domain
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add domain</DialogTitle>
              </DialogHeader>
              <form onSubmit={onCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hostname">Hostname</Label>
                  <Input
                    id="hostname"
                    placeholder="example.com"
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Main title</Label>
                  <Input
                    id="title"
                    placeholder="Brand landing title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={pending} className="w-full">
                  Save domain
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Domains</CardTitle>
          <CardDescription>
            {domains.length} domain{domains.length === 1 ? "" : "s"} in this
            brand · click a column header to sort
          </CardDescription>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No domains yet. Add your first domain to start tracking inventory.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead
                      label="Domain"
                      sortKey="hostname"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="Title"
                      sortKey="title"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="DR"
                      sortKey="dr"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="Backlinks"
                      sortKey="backlinks"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="Ref. domains"
                      sortKey="refdomains"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="Social"
                      sortKey="social"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="Last synced"
                      sortKey="synced"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.pageItems.map((domain) => {
                    const metrics = metricsOf(domain);
                    const href = `/${brand.slug}/domains/${domain.id}`;
                    return (
                      <TableRow
                        key={domain.id}
                        className="cursor-pointer"
                        onClick={() => router.push(href)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(href);
                          }
                        }}
                        tabIndex={0}
                        role="link"
                      >
                        <TableCell>
                          <span className="font-medium">{domain.hostname}</span>
                          {domain.ahrefs_sync_error && (
                            <p
                              className="mt-1 max-w-xs truncate text-xs text-destructive"
                              title={domain.ahrefs_sync_error}
                            >
                              {domain.ahrefs_sync_error}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {domain.title || "—"}
                        </TableCell>
                        <TableCell className="table-numeric">
                          {formatNumber(metrics?.domain_rating ?? null)}
                        </TableCell>
                        <TableCell className="table-numeric">
                          {formatNumber(metrics?.backlinks ?? null)}
                        </TableCell>
                        <TableCell className="table-numeric">
                          {formatNumber(metrics?.refdomains ?? null)}
                        </TableCell>
                        <TableCell className="table-numeric">
                          {domain.domain_social_signals?.length ?? 0}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {domain.ahrefs_last_synced_at
                            ? formatDistanceToNow(
                                new Date(domain.ahrefs_last_synced_at),
                                { addSuffix: true },
                              )
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget({
                                id: domain.id,
                                hostname: domain.hostname,
                              });
                            }}
                            disabled={pending}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete domain?"
        description={`This will permanently remove “${deleteTarget?.hostname ?? ""}” and its Ahrefs data and social signals.`}
        pending={pending}
        onConfirm={removeDomain}
      />
    </div>
  );
}
