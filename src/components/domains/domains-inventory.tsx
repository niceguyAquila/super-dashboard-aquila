"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  createDomain,
  deleteDomain,
} from "@/lib/actions/domains";
import type { Brand } from "@/lib/types";
import { formatNumber } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function metricsOf(row: DomainRow) {
  const m = row.domain_ahrefs_metrics;
  if (!m) return null;
  return Array.isArray(m) ? m[0] ?? null : m;
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
  const [pending, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);
  const [hostname, setHostname] = useState("");
  const [title, setTitle] = useState("");

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
      router.refresh();
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
        router.refresh();
      } else {
        toast.success(`Synced ${json.synced} domain${json.synced === 1 ? "" : "s"}`);
        router.refresh();
      }
    } catch {
      toast.error("Sync request failed");
    } finally {
      setSyncing(false);
    }
  }

  function removeDomain(id: string, hostnameLabel: string) {
    if (!confirm(`Delete ${hostnameLabel}?`)) return;
    const fd = new FormData();
    fd.set("id", id);
    fd.set("brandSlug", brand.slug);
    startTransition(async () => {
      const result = await deleteDomain(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Domain deleted");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">
            Domain inventory
          </h1>
          <p className="page-subtitle">
            Track titles, social signals, and Ahrefs metrics for {brand.name}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={syncAll}
            disabled={syncing || domains.length === 0}
          >
            <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
            Sync Ahrefs
          </Button>
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
            {domains.length} domain{domains.length === 1 ? "" : "s"} in this brand
          </CardDescription>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No domains yet. Add your first domain to start tracking inventory.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>DR</TableHead>
                  <TableHead>Backlinks</TableHead>
                  <TableHead>Ref. domains</TableHead>
                  <TableHead>Social</TableHead>
                  <TableHead>Last synced</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => {
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
                            removeDomain(domain.id, domain.hostname);
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
