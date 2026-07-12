"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Plus, Trash2 } from "lucide-react";
import { deleteAdEntry, upsertAdEntry } from "@/lib/actions/ads";
import type { AdEntry, AdPlatform, Brand } from "@/lib/types";
import {
  computeCpr,
  formatCurrency,
  formatCpr,
  formatNumber,
} from "@/lib/utils/format";
import { AdPlatformsManager } from "@/components/ads/ad-platforms-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type AdsSortKey =
  | "date"
  | "platform"
  | "spend"
  | "regs"
  | "deposits"
  | "cpr"
  | "notes";

function platformName(entry: AdEntry) {
  return entry.ad_platforms?.name ?? "";
}

function adsSortValue(entry: AdEntry, key: AdsSortKey): string | number {
  switch (key) {
    case "date":
      return entry.entry_date;
    case "platform":
      return platformName(entry).toLowerCase();
    case "spend":
      return Number(entry.spend);
    case "regs":
      return Number(entry.registrations);
    case "deposits":
      return Number(entry.deposits);
    case "cpr": {
      const regs = Number(entry.registrations);
      return regs > 0 ? Number(entry.spend) / regs : -1;
    }
    case "notes":
      return (entry.notes ?? "").toLowerCase();
  }
}

function toInputDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toInputDate(d);
}

const selectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AdsDashboard({
  brand,
  platforms,
  entries,
  initialFrom,
  initialTo,
}: {
  brand: Brand;
  platforms: AdPlatform[];
  entries: AdEntry[];
  initialFrom?: string;
  initialTo?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(initialFrom ?? defaultFrom());
  const [to, setTo] = useState(initialTo ?? toInputDate());
  const activePlatforms = useMemo(
    () => platforms.filter((p) => p.is_active),
    [platforms],
  );
  const [platformId, setPlatformId] = useState(
    () => activePlatforms[0]?.id ?? "",
  );
  const [entryDate, setEntryDate] = useState(toInputDate());
  const [spend, setSpend] = useState("0");
  const [registrations, setRegistrations] = useState("0");
  const [deposits, setDeposits] = useState("0");
  const [notes, setNotes] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const totals = useMemo(() => {
    const spendSum = entries.reduce((s, e) => s + Number(e.spend), 0);
    const regs = entries.reduce((s, e) => s + Number(e.registrations), 0);
    const deps = entries.reduce((s, e) => s + Number(e.deposits), 0);
    return {
      spend: spendSum,
      registrations: regs,
      deposits: deps,
      cpr: computeCpr(spendSum, regs),
    };
  }, [entries]);

  const getAdsSortValue = useCallback(adsSortValue, []);
  const {
    sorted: sortedEntries,
    sortKey,
    sortDir,
    toggleSort: toggleAdsSort,
  } = useSort<AdEntry, AdsSortKey>(entries, "date", "desc", getAdsSortValue, {
    defaultDirForKey: (key) =>
      key === "notes" || key === "platform" ? "asc" : "desc",
  });
  const pagination = usePagination(sortedEntries);

  function toggleSort(key: AdsSortKey) {
    toggleAdsSort(key);
    pagination.setPage(1);
  }

  const chartData = useMemo(() => {
    const byDate = new Map<
      string,
      { date: string; spend: number; registrations: number; deposits: number }
    >();
    for (const e of entries) {
      const existing = byDate.get(e.entry_date) ?? {
        date: e.entry_date,
        spend: 0,
        registrations: 0,
        deposits: 0,
      };
      existing.spend += Number(e.spend);
      existing.registrations += Number(e.registrations);
      existing.deposits += Number(e.deposits);
      byDate.set(e.entry_date, existing);
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [entries]);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/${brand.slug}/ads?${params.toString()}`);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      const first = activePlatforms[0]?.id ?? "";
      setPlatformId((current) =>
        activePlatforms.some((p) => p.id === current) ? current : first,
      );
    }
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!platformId) {
      toast.error("Add an active platform first");
      return;
    }
    const fd = new FormData();
    fd.set("brandId", brand.id);
    fd.set("brandSlug", brand.slug);
    fd.set("platformId", platformId);
    fd.set("entryDate", entryDate);
    fd.set("spend", spend);
    fd.set("registrations", registrations);
    fd.set("deposits", deposits);
    fd.set("notes", notes);
    startTransition(async () => {
      const result = await upsertAdEntry(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success("ADS entry saved");
        setOpen(false);
        setNotes("");
        router.refresh();
      }
    });
  }

  function remove() {
    if (!deleteId) return;
    const fd = new FormData();
    fd.set("id", deleteId);
    fd.set("brandSlug", brand.slug);
    startTransition(async () => {
      const result = await deleteAdEntry(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Deleted");
        setDeleteId(null);
        router.refresh();
      }
    });
  }

  const canAddEntry = activePlatforms.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">ADS performance</h1>
          <p className="page-subtitle">
            Manual spend, registrations, deposits, and CPR per platform for{" "}
            {brand.name}.
          </p>
        </div>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogTrigger
            render={
              <Button disabled={!canAddEntry}>
                <Plus className="size-3.5" />
                Add entry
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add / update ADS entry</DialogTitle>
            </DialogHeader>
            {canAddEntry ? (
              <form onSubmit={onSave} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <select
                    id="platform"
                    className={selectClassName}
                    value={platformId}
                    onChange={(e) => setPlatformId(e.target.value)}
                    required
                  >
                    {activePlatforms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entryDate">Date</Label>
                  <Input
                    id="entryDate"
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="spend">Spend</Label>
                    <Input
                      id="spend"
                      type="number"
                      min="0"
                      step="0.01"
                      value={spend}
                      onChange={(e) => setSpend(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regs">Regs</Label>
                    <Input
                      id="regs"
                      type="number"
                      min="0"
                      step="1"
                      value={registrations}
                      onChange={(e) => setRegistrations(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deps">Deposits</Label>
                    <Input
                      id="deps"
                      type="number"
                      min="0"
                      step="1"
                      value={deposits}
                      onChange={(e) => setDeposits(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  CPR preview:{" "}
                  {formatCpr(Number(spend), Number(registrations))}
                </p>
                <Button type="submit" className="w-full" disabled={pending}>
                  Save entry
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                Add an active platform first to log spend, regs, and deposits.
              </p>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <AdPlatformsManager brand={brand} platforms={platforms} />

      <Card>
        <CardContent className="pt-6">
          <form
            onSubmit={applyFilters}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline">
              Apply range
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Spend</CardDescription>
            <CardTitle className="metric-value">
              {formatCurrency(totals.spend)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Registrations</CardDescription>
            <CardTitle className="metric-value">
              {formatNumber(totals.registrations)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Deposits</CardDescription>
            <CardTitle className="metric-value">
              {formatNumber(totals.deposits)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>CPR</CardDescription>
            <CardTitle className="metric-value">
              {totals.cpr == null ? "—" : formatCurrency(totals.cpr)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trend</CardTitle>
          <CardDescription>
            Spend vs registrations over the selected range (all platforms).
          </CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No entries in this range yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="spend"
                  stroke="#065f46"
                  strokeWidth={2}
                  dot={false}
                  name="Spend"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="registrations"
                  stroke="#b45309"
                  strokeWidth={2}
                  dot={false}
                  name="Registrations"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entries</CardTitle>
          <CardDescription>
            {entries.length} row{entries.length === 1 ? "" : "s"} in range
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No ADS entries yet. Add a daily entry per platform to start
              tracking CPR.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead
                      label="Date"
                      sortKey="date"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="Platform"
                      sortKey="platform"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="Spend"
                      sortKey="spend"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="Regs"
                      sortKey="regs"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="Deposits"
                      sortKey="deposits"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="CPR"
                      sortKey="cpr"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="Notes"
                      sortKey="notes"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.pageItems.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.entry_date}
                      </TableCell>
                      <TableCell>
                        {platformName(entry) || "—"}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatCurrency(Number(entry.spend))}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(entry.registrations)}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatNumber(entry.deposits)}
                      </TableCell>
                      <TableCell className="table-numeric">
                        {formatCpr(Number(entry.spend), entry.registrations)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {entry.notes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => setDeleteId(entry.id)}
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
                id="ads-page-size"
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
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete ADS entry?"
        description="This will permanently remove this platform’s daily performance row."
        pending={pending}
        onConfirm={remove}
      />
    </div>
  );
}
