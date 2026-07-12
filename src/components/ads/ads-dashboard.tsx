"use client";

import { useMemo, useState, useTransition } from "react";
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
import type { AdEntry, Brand } from "@/lib/types";
import {
  computeCpr,
  formatCurrency,
  formatCpr,
  formatNumber,
} from "@/lib/utils/format";
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

function toInputDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toInputDate(d);
}

export function AdsDashboard({
  brand,
  entries,
  initialFrom,
  initialTo,
}: {
  brand: Brand;
  entries: AdEntry[];
  initialFrom?: string;
  initialTo?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(initialFrom ?? defaultFrom());
  const [to, setTo] = useState(initialTo ?? toInputDate());
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

  const chartData = useMemo(
    () =>
      [...entries]
        .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
        .map((e) => ({
          date: e.entry_date,
          spend: Number(e.spend),
          registrations: Number(e.registrations),
          deposits: Number(e.deposits),
        })),
    [entries],
  );

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/${brand.slug}/ads?${params.toString()}`);
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("brandId", brand.id);
    fd.set("brandSlug", brand.slug);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">
            ADS performance
          </h1>
          <p className="page-subtitle">
            Manual spend, registrations, deposits, and CPR for {brand.name}.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="size-3.5" />
                Add entry
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add / update ADS entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSave} className="space-y-3">
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
          </DialogContent>
        </Dialog>
      </div>

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
          <CardDescription>Spend vs registrations over the selected range.</CardDescription>
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
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
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
              No ADS entries yet. Add a daily entry to start tracking CPR.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Spend</TableHead>
                  <TableHead>Regs</TableHead>
                  <TableHead>Deposits</TableHead>
                  <TableHead>CPR</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {entry.entry_date}
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
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete ADS entry?"
        description="This will permanently remove this daily performance row."
        pending={pending}
        onConfirm={remove}
      />
    </div>
  );
}
