"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, RefreshCw } from "lucide-react";
import {
  revalidateDomainsView,
  updateDomain,
} from "@/lib/actions/domains";
import type { Brand } from "@/lib/types";
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
  domain_anchors: AnchorRow[];
  domain_backlinks: BacklinkRow[];
  domain_refdomains: RefdomainRow[];
  domain_organic_keywords: OrganicKeywordRow[];
  domain_top_pages: TopPageRow[];
};

function firstMetrics(domain: DomainDetailData): AhrefsMetrics | null {
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

  const metrics = firstMetrics(domain);

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

      <Card className="max-w-xl">
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

      <DomainAhrefsPanels
        metrics={metrics}
        anchors={domain.domain_anchors ?? []}
        backlinks={domain.domain_backlinks ?? []}
        refdomains={domain.domain_refdomains ?? []}
        organicKeywords={domain.domain_organic_keywords ?? []}
        topPages={domain.domain_top_pages ?? []}
      />
    </div>
  );
}
