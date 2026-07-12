"use client";

import { useState, useTransition } from "react";
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
  updateDomain,
} from "@/lib/actions/domains";
import type { Brand } from "@/lib/types";
import { formatNumber } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

type DomainDetailData = {
  id: string;
  hostname: string;
  title: string | null;
  notes: string | null;
  ahrefs_last_synced_at: string | null;
  ahrefs_sync_error: string | null;
  domain_ahrefs_metrics:
    | {
        domain_rating: number | null;
        url_rating: number | null;
        backlinks: number | null;
        refdomains: number | null;
        organic_keywords: number | null;
        organic_traffic: number | null;
        fetched_at: string;
      }
    | {
        domain_rating: number | null;
        url_rating: number | null;
        backlinks: number | null;
        refdomains: number | null;
        organic_keywords: number | null;
        organic_traffic: number | null;
        fetched_at: string;
      }[]
    | null;
  domain_social_signals: {
    id: string;
    label: string;
    url: string;
  }[];
  domain_anchors: {
    id: string;
    anchor: string;
    backlinks: number | null;
    refdomains: number | null;
  }[];
  domain_backlinks: {
    id: string;
    url_from: string;
    anchor: string | null;
    domain_rating_source: number | null;
    is_dofollow: boolean | null;
  }[];
};

function firstMetrics(domain: DomainDetailData) {
  const m = domain.domain_ahrefs_metrics;
  if (!m) return null;
  return Array.isArray(m) ? m[0] ?? null : m;
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

  const metrics = firstMetrics(domain);
  const anchors = usePagination(domain.domain_anchors, 20);
  const backlinks = usePagination(domain.domain_backlinks, 20);

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
      toast.success(`Imported ${result.imported} social signal${result.imported === 1 ? "" : "s"}`);
      setBulkText("");
      setBulkOpen(false);
      router.refresh();
    });
  }

  function removeSignal(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("domainId", domain.id);
    fd.set("brandSlug", brand.slug);
    startTransition(async () => {
      const result = await deleteSocialSignal(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Removed");
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
        router.refresh();
      } else {
        toast.success("Ahrefs data refreshed");
        router.refresh();
      }
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Domain Rating", value: formatNumber(metrics?.domain_rating) },
          { label: "Backlinks", value: formatNumber(metrics?.backlinks) },
          { label: "Referring domains", value: formatNumber(metrics?.refdomains) },
          {
            label: "Organic keywords",
            value: formatNumber(metrics?.organic_keywords),
          },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="metric-value">{item.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
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
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Bulk import social signals</DialogTitle>
                  <DialogDescription>
                    One entry per line. Supported formats:{" "}
                    <code className="text-xs">Label,URL</code>,{" "}
                    <code className="text-xs">Label | URL</code>, or a bare URL.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={importBulk} className="space-y-4">
                  <Textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    rows={10}
                    placeholder={`Twitter,https://x.com/brand\nTelegram | https://t.me/brand\nhttps://facebook.com/brand`}
                    required
                  />
                  <Button type="submit" className="w-full" disabled={pending}>
                    Import links
                  </Button>
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
              <ul className="space-y-2">
                {domain.domain_social_signals.map((signal) => (
                  <li
                    key={signal.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <Badge variant="secondary">{signal.label}</Badge>
                      <a
                        href={signal.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 flex items-center gap-1 truncate text-sm text-emerald-800 hover:underline"
                      >
                        {signal.url}
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => removeSignal(signal.id)}
                      disabled={pending}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top anchors</CardTitle>
          <CardDescription>
            Cached from Ahrefs — {domain.domain_anchors.length} total, 20 per page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {domain.domain_anchors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No anchors yet. Run Sync to pull Ahrefs data.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Anchor</TableHead>
                    <TableHead>Backlinks</TableHead>
                    <TableHead>Ref. domains</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anchors.pageItems.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-md truncate font-medium">
                        {row.anchor}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(row.backlinks)}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(row.refdomains)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                page={anchors.page}
                totalPages={anchors.totalPages}
                from={anchors.from}
                to={anchors.to}
                total={anchors.total}
                onPageChange={anchors.setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top backlinks</CardTitle>
          <CardDescription>
            Cached from Ahrefs — {domain.domain_backlinks.length} total, 20 per page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {domain.domain_backlinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No backlinks yet. Run Sync to pull Ahrefs data.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>Anchor</TableHead>
                    <TableHead>DR</TableHead>
                    <TableHead>Follow</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backlinks.pageItems.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-xs truncate">
                        <a
                          href={row.url_from}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          {row.url_from}
                        </a>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {row.anchor || "—"}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(row.domain_rating_source)}
                      </TableCell>
                      <TableCell>
                        {row.is_dofollow == null
                          ? "—"
                          : row.is_dofollow
                            ? "Dofollow"
                            : "Nofollow"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                page={backlinks.page}
                totalPages={backlinks.totalPages}
                from={backlinks.from}
                to={backlinks.to}
                total={backlinks.total}
                onPageChange={backlinks.setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
