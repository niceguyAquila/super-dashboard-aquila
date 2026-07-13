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
import { Pencil, Plus, Settings2, Trash2 } from "lucide-react";
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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toInputDate(d);
}

type DatePresetId =
  | "today"
  | "yesterday"
  | "last7"
  | "thisWeek"
  | "thisMonth"
  | "lastMonth"
  | "thisYear";

type DateRange = { from: string; to: string };

const DATE_PRESETS: { id: DatePresetId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "thisWeek", label: "This week" },
  { id: "thisMonth", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "thisYear", label: "This year" },
];

function getDatePresetRange(id: DatePresetId, now = new Date()): DateRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (id) {
    case "today":
      return { from: toInputDate(today), to: toInputDate(today) };
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: toInputDate(yesterday), to: toInputDate(yesterday) };
    }
    case "last7": {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { from: toInputDate(start), to: toInputDate(today) };
    }
    case "thisWeek": {
      // Week starts Monday
      const day = today.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(today);
      monday.setDate(monday.getDate() + mondayOffset);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      return { from: toInputDate(monday), to: toInputDate(sunday) };
    }
    case "thisMonth": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from: toInputDate(start), to: toInputDate(end) };
    }
    case "lastMonth": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: toInputDate(start), to: toInputDate(end) };
    }
    case "thisYear": {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31);
      return { from: toInputDate(start), to: toInputDate(end) };
    }
  }
}

function matchDatePreset(from: string, to: string): DatePresetId | null {
  for (const preset of DATE_PRESETS) {
    const range = getDatePresetRange(preset.id);
    if (range.from === from && range.to === to) return preset.id;
  }
  return null;
}

const selectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const PLATFORM_COLORS = [
  "#1d4ed8", // blue
  "#0f766e", // teal
  "#b45309", // amber
  "#be123c", // rose
  "#334155", // slate
  "#0369a1", // sky
  "#155e75", // cyan
  "#c2410c", // orange
  "#1e3a5f", // navy
  "#3f6212", // olive
];

function spendKey(platformId: string) {
  return `spend_${platformId}`;
}

export function AdsDashboard({
  brand,
  platforms,
  entries,
  initialFrom,
  initialTo,
  initialPlatformId,
}: {
  brand: Brand;
  platforms: AdPlatform[];
  entries: AdEntry[];
  initialFrom?: string;
  initialTo?: string;
  initialPlatformId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [entryOpen, setEntryOpen] = useState(false);
  const [platformsOpen, setPlatformsOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AdEntry | null>(null);
  const [from, setFrom] = useState(initialFrom ?? defaultFrom());
  const [to, setTo] = useState(initialTo ?? toInputDate());
  const [filterPlatformId, setFilterPlatformId] = useState(
    initialPlatformId ?? "",
  );
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

  const platformOptions = useMemo(() => {
    const byId = new Map(activePlatforms.map((p) => [p.id, p]));
    if (editingEntry) {
      const current = platforms.find((p) => p.id === editingEntry.platform_id);
      if (current) byId.set(current.id, current);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [activePlatforms, editingEntry, platforms]);

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

  const chartPlatforms = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of entries) {
      if (!seen.has(e.platform_id)) {
        seen.set(
          e.platform_id,
          platformName(e) ||
            platforms.find((p) => p.id === e.platform_id)?.name ||
            "Unknown",
        );
      }
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entries, platforms]);

  const chartData = useMemo(() => {
    const byDate = new Map<string, Record<string, string | number>>();
    for (const e of entries) {
      const row = byDate.get(e.entry_date) ?? { date: e.entry_date };
      const key = spendKey(e.platform_id);
      row[key] = Number(row[key] ?? 0) + Number(e.spend);
      byDate.set(e.entry_date, row);
    }
    return [...byDate.values()]
      .map((row) => {
        const filled = { ...row };
        for (const platform of chartPlatforms) {
          const key = spendKey(platform.id);
          if (filled[key] == null) filled[key] = 0;
        }
        return filled;
      })
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [entries, chartPlatforms]);

  const activeDatePreset = useMemo(
    () => matchDatePreset(from, to),
    [from, to],
  );

  function pushFilters(nextFrom: string, nextTo: string, platform: string) {
    const params = new URLSearchParams();
    if (nextFrom) params.set("from", nextFrom);
    if (nextTo) params.set("to", nextTo);
    if (platform) params.set("platform", platform);
    router.push(`/${brand.slug}/ads?${params.toString()}`);
  }

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    pushFilters(from, to, filterPlatformId);
  }

  function applyDatePreset(id: DatePresetId) {
    const range = getDatePresetRange(id);
    setFrom(range.from);
    setTo(range.to);
    pushFilters(range.from, range.to, filterPlatformId);
  }

  function resetEntryForm() {
    setEditingEntry(null);
    setPlatformId(activePlatforms[0]?.id ?? "");
    setEntryDate(toInputDate());
    setSpend("0");
    setRegistrations("0");
    setDeposits("0");
    setNotes("");
  }

  function openAddEntry() {
    resetEntryForm();
    setEntryOpen(true);
  }

  function openEditEntry(entry: AdEntry) {
    setEditingEntry(entry);
    setPlatformId(entry.platform_id);
    setEntryDate(entry.entry_date);
    setSpend(String(entry.spend));
    setRegistrations(String(entry.registrations));
    setDeposits(String(entry.deposits));
    setNotes(entry.notes ?? "");
    setEntryOpen(true);
  }

  function onEntryOpenChange(next: boolean) {
    setEntryOpen(next);
    if (!next) {
      setEditingEntry(null);
      return;
    }
    if (!editingEntry) {
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
    if (editingEntry) fd.set("id", editingEntry.id);
    startTransition(async () => {
      const result = await upsertAdEntry(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success(editingEntry ? "ADS entry updated" : "ADS entry saved");
        setEntryOpen(false);
        resetEntryForm();
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
  const canSaveEntry = editingEntry
    ? platformOptions.length > 0
    : canAddEntry;

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
        <div className="flex flex-wrap gap-2">
          <Dialog open={platformsOpen} onOpenChange={setPlatformsOpen}>
            <DialogTrigger
              render={
                <Button variant="outline">
                  <Settings2 className="size-3.5" />
                  Manage platforms
                </Button>
              }
            />
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Ad platforms</DialogTitle>
              </DialogHeader>
              <AdPlatformsManager brand={brand} platforms={platforms} />
            </DialogContent>
          </Dialog>

          <Button disabled={!canAddEntry} onClick={openAddEntry}>
            <Plus className="size-3.5" />
            Add entry
          </Button>
        </div>
      </div>

      <Dialog open={entryOpen} onOpenChange={onEntryOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Edit ADS entry" : "Add ADS entry"}
            </DialogTitle>
          </DialogHeader>
          {canSaveEntry ? (
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
                  {platformOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {!p.is_active ? " (inactive)" : ""}
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
                CPR preview: {formatCpr(Number(spend), Number(registrations))}
              </p>
              <Button type="submit" className="w-full" disabled={pending}>
                {editingEntry ? "Update entry" : "Save entry"}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add an active platform first to log spend, regs, and deposits.
              Use Manage platforms to create one.
            </p>
          )}
        </DialogContent>
      </Dialog>

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
            Daily spend by platform over the selected filters.
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
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(Number(value ?? 0)),
                    String(name),
                  ]}
                />
                <Legend />
                {chartPlatforms.map((platform, index) => (
                  <Line
                    key={platform.id}
                    type="monotone"
                    dataKey={spendKey(platform.id)}
                    stroke={PLATFORM_COLORS[index % PLATFORM_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    name={platform.name}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant={
                  activeDatePreset === preset.id ? "default" : "outline"
                }
                onClick={() => applyDatePreset(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
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
            <div className="min-w-[12rem] space-y-2">
              <Label htmlFor="filter-platform">Platform</Label>
              <select
                id="filter-platform"
                className={selectClassName}
                value={filterPlatformId}
                onChange={(e) => setFilterPlatformId(e.target.value)}
              >
                <option value="">All platforms</option>
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {!p.is_active ? " (inactive)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="outline">
              Apply filters
            </Button>
          </form>
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
                      label="Registers"
                      sortKey="regs"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="FTD"
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
                      <TableCell>{platformName(entry) || "—"}</TableCell>
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
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => openEditEntry(entry)}
                            disabled={pending}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => setDeleteId(entry.id)}
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
