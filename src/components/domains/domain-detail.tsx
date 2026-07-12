"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import {
  addSocialSignal,
  bulkImportSocialSignals,
  deleteSocialSignal,
  revalidateDomainsView,
  updateDomain,
} from "@/lib/actions/domains";
import type { Brand } from "@/lib/types";
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
import {
  DomainAhrefsPanels,
  type AhrefsMetrics,
  type AnchorRow,
  type BacklinkRow,
  type OrganicKeywordRow,
  type RefdomainRow,
  type TopPageRow,
} from "@/components/domains/domain-ahrefs-panels";

type DomainDetailData = {
  id: string;
  hostname: string;
  title: string | null;
  notes: string | null;
  ahrefs_last_synced_at: string | null;
  ahrefs_sync_error: string | null;
  domain_ahrefs_metrics: AhrefsMetrics | AhrefsMetrics[] | null;
  domain_social_signals: {
    id: string;
    label: string;
    url: string;
  }[];
  domain_anchors: AnchorRow[];
  domain_backlinks: BacklinkRow[];
  domain_refdomains: RefdomainRow[];
  domain_organic_keywords: OrganicKeywordRow[];
  domain_top_pages: TopPageRow[];
};

type SignalSortKey = "label" | "url";

function firstMetrics(domain: DomainDetailData): AhrefsMetrics | null {
  const m = domain.domain_ahrefs_metrics;
  if (!m) return null;
  return Array.isArray(m) ? m[0] ?? null : m;
}

function signalSortValue(
  row: DomainDetailData["domain_social_signals"][number],
  key: SignalSortKey,
) {
  return key === "label" ? row.label.toLowerCase() : row.url.toLowerCase();
}

export function DomainDetail({
  brand,
  domain,
}: {
  brand: Brand;
  domain: DomainDetailData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);
  const [title, setTitle] = useState(domain.title ?? "");
  const [notes, setNotes] = useState(domain.notes ?? "");
  const [signalLabel, setSignalLabel] = useState("");
  const [signalUrl, setSignalUrl] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [deleteSignal, setDeleteSignal] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const metrics = firstMetrics(domain);
  const getSignalSortValue = useCallback(signalSortValue, []);
  const {
    sorted: sortedSignals,
    sortKey: signalSortKey,
    sortDir: signalSortDir,
    toggleSort: toggleSignalSort,
  } = useSort<
    DomainDetailData["domain_social_signals"][number],
    SignalSortKey
  >(domain.domain_social_signals, "label", "asc", getSignalSortValue);
  const signals = usePagination(sortedSignals);

  function toggleSignalSortAndReset(key: SignalSortKey) {
    toggleSignalSort(key);
    signals.setPage(1);
  }

  function saveDomain(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("id", domain.id);
    fd.set("brandSlug", brand.slug);
    fd.set("title", title);
    fd.set("notes", notes);
    startTransition(async () => {
      const result = await updateDomain(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Domain updated");
        router.refresh();
      }
    });
  }

  function addSignal(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("domainId", domain.id);
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
    fd.set("domainId", domain.id);
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

  function removeSignal() {
    if (!deleteSignal) return;
    const fd = new FormData();
    fd.set("id", deleteSignal.id);
    fd.set("domainId", domain.id);
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

  async function syncNow() {
    setSyncing(true);
    try {
      const res = await fetch("/api/ahrefs/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId: domain.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Sync failed", { duration: 12000 });
      } else if (json.results?.[0]?.ok === false) {
        toast.error(json.results[0].error ?? "Sync failed", {
          duration: 12000,
        });
      } else {
        toast.success("Ahrefs data refreshed");
      }
      await revalidateDomainsView(brand.slug, domain.id);
      router.refresh();
    } catch {
      toast.error("Sync request failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`/${brand.slug}/domains`}
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to domains
          </Link>
          <h1 className="page-title">{domain.hostname}</h1>
          <p className="page-subtitle">
            {domain.ahrefs_last_synced_at
              ? `Last synced ${formatDistanceToNow(new Date(domain.ahrefs_last_synced_at), { addSuffix: true })}`
              : "Not synced with Ahrefs yet"}
          </p>
          {domain.ahrefs_sync_error && (
            <p className="mt-2 text-sm text-destructive">
              Sync error: {domain.ahrefs_sync_error}
            </p>
          )}
        </div>
        <Button onClick={syncNow} disabled={syncing} variant="outline">
          <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
          Sync now
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Domain details</CardTitle>
            <CardDescription>Main title and notes for this domain.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveDomain} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Main title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Primary site title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>
              <Button type="submit" disabled={pending}>
                Save details
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Social signals</CardTitle>
              <CardDescription>
                Import and track social profile / signal links for this domain.
              </CardDescription>
            </div>
            <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
              <DialogTrigger
                render={
                  <Button variant="outline" size="sm">
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
                      {
                        bulkText
                          .split(/\r?\n/)
                          .map((l) => l.trim())
                          .filter((l) => l && !l.startsWith("#")).length
                      }{" "}
                      line
                      {bulkText
                        .split(/\r?\n/)
                        .map((l) => l.trim())
                        .filter((l) => l && !l.startsWith("#")).length === 1
                        ? ""
                        : "s"}{" "}
                      ready
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
                      <Button type="submit" disabled={pending}>
                        {pending ? "Importing…" : "Import links"}
                      </Button>
                    </div>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
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

            {domain.domain_social_signals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No social signal links yet.
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signals.pageItems.map((signal) => (
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
                        <TableCell className="text-right">
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  id="signals-page-size"
                  page={signals.page}
                  pageSize={signals.pageSize}
                  totalPages={signals.totalPages}
                  from={signals.from}
                  to={signals.to}
                  total={signals.total}
                  onPageChange={signals.setPage}
                  onPageSizeChange={signals.setPageSize}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <DomainAhrefsPanels
        metrics={metrics}
        anchors={domain.domain_anchors ?? []}
        backlinks={domain.domain_backlinks ?? []}
        refdomains={domain.domain_refdomains ?? []}
        organicKeywords={domain.domain_organic_keywords ?? []}
        topPages={domain.domain_top_pages ?? []}
      />

      <ConfirmDialog
        open={!!deleteSignal}
        onOpenChange={(open) => {
          if (!open) setDeleteSignal(null);
        }}
        title="Delete social signal?"
        description={`This will remove the “${deleteSignal?.label ?? ""}” link from this domain.`}
        pending={pending}
        onConfirm={removeSignal}
      />
    </div>
  );
}
