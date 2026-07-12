"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Plus, Trash2, Upload } from "lucide-react";
import {
  addSocialSignal,
  bulkImportSocialSignals,
  deleteSocialSignal,
} from "@/lib/actions/social";
import type { Brand, BrandSocialSignal } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type SignalSortKey = "label" | "url";

function signalSortValue(row: BrandSocialSignal, key: SignalSortKey) {
  return key === "label" ? row.label.toLowerCase() : row.url.toLowerCase();
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
  const [signalLabel, setSignalLabel] = useState("");
  const [signalUrl, setSignalUrl] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [deleteSignal, setDeleteSignal] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const bulkLineCount = bulkText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#")).length;

  const getSignalSortValue = useCallback(signalSortValue, []);
  const {
    sorted: sortedSignals,
    sortKey: signalSortKey,
    sortDir: signalSortDir,
    toggleSort: toggleSignalSort,
  } = useSort<BrandSocialSignal, SignalSortKey>(
    signals,
    "label",
    "asc",
    getSignalSortValue,
  );
  const pagination = usePagination(sortedSignals);

  function toggleSignalSortAndReset(key: SignalSortKey) {
    toggleSignalSort(key);
    pagination.setPage(1);
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

          {signals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No social signal links yet. Add your first link above.
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
