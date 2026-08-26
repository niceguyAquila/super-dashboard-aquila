"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createSubscription,
  deleteSubscription,
  renewSubscription,
  updateSubscription,
} from "@/lib/actions/subscriptions";
import {
  renewalUrgency,
  summarizeSubscriptions,
} from "@/lib/subscriptions/summary";
import type {
  BillingCycle,
  Subscription,
  SubscriptionKind,
  SubscriptionStatus,
} from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
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
import { cn } from "@/lib/utils";

const SELECT_CLASS =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type FormState = {
  name: string;
  kind: SubscriptionKind;
  vendor: string;
  cost: string;
  currency: string;
  billing_cycle: BillingCycle;
  started_at: string;
  renews_at: string;
  status: SubscriptionStatus;
  login_url: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  kind: "tool",
  vendor: "",
  cost: "",
  currency: "USD",
  billing_cycle: "monthly",
  started_at: "",
  renews_at: "",
  status: "active",
  login_url: "",
  notes: "",
};

function toFormState(sub: Subscription): FormState {
  return {
    name: sub.name,
    kind: sub.kind,
    vendor: sub.vendor ?? "",
    cost: sub.cost == null ? "" : String(sub.cost),
    currency: sub.currency || "USD",
    billing_cycle: sub.billing_cycle,
    started_at: sub.started_at ?? "",
    renews_at: sub.renews_at ?? "",
    status: sub.status,
    login_url: sub.login_url ?? "",
    notes: sub.notes ?? "",
  };
}

function appendFormFields(fd: FormData, form: FormState) {
  fd.set("name", form.name);
  fd.set("kind", form.kind);
  fd.set("vendor", form.vendor);
  fd.set("cost", form.cost);
  fd.set("currency", form.currency);
  fd.set("billing_cycle", form.billing_cycle);
  fd.set("started_at", form.started_at);
  fd.set("renews_at", form.renews_at);
  fd.set("status", form.status);
  fd.set("login_url", form.login_url);
  fd.set("notes", form.notes);
}

function formatCycle(cycle: BillingCycle): string {
  if (cycle === "one_time") return "one-time";
  return cycle;
}

function formatKind(kind: SubscriptionKind): string {
  return kind === "tool" ? "Tool" : "Server";
}

type SortKey =
  | "name"
  | "kind"
  | "vendor"
  | "cost"
  | "renews_at"
  | "status";

function sortValue(
  sub: Subscription,
  key: SortKey,
): string | number | null {
  switch (key) {
    case "name":
      return sub.name.toLowerCase();
    case "kind":
      return sub.kind;
    case "vendor":
      return (sub.vendor ?? "").toLowerCase();
    case "cost":
      return sub.cost;
    case "renews_at":
      return sub.renews_at;
    case "status":
      return sub.status;
  }
}

function SubscriptionFields({
  form,
  setForm,
  idPrefix,
}: {
  form: FormState;
  setForm: (next: FormState) => void;
  idPrefix: string;
}) {
  function patch(partial: Partial<FormState>) {
    setForm({ ...form, ...partial });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input
          id={`${idPrefix}-name`}
          value={form.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Ahrefs / DO droplet"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-kind`}>Type</Label>
        <select
          id={`${idPrefix}-kind`}
          className={SELECT_CLASS}
          value={form.kind}
          onChange={(e) => patch({ kind: e.target.value as SubscriptionKind })}
        >
          <option value="tool">Tool</option>
          <option value="server">Server</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-status`}>Status</Label>
        <select
          id={`${idPrefix}-status`}
          className={SELECT_CLASS}
          value={form.status}
          onChange={(e) =>
            patch({ status: e.target.value as SubscriptionStatus })
          }
        >
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-vendor`}>Vendor</Label>
        <Input
          id={`${idPrefix}-vendor`}
          value={form.vendor}
          onChange={(e) => patch({ vendor: e.target.value })}
          placeholder="DigitalOcean"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-cycle`}>Billing cycle</Label>
        <select
          id={`${idPrefix}-cycle`}
          className={SELECT_CLASS}
          value={form.billing_cycle}
          onChange={(e) =>
            patch({ billing_cycle: e.target.value as BillingCycle })
          }
        >
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="one_time">One-time</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-cost`}>Cost</Label>
        <Input
          id={`${idPrefix}-cost`}
          type="number"
          min="0"
          step="0.01"
          value={form.cost}
          onChange={(e) => patch({ cost: e.target.value })}
          placeholder="29.00"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-currency`}>Currency</Label>
        <Input
          id={`${idPrefix}-currency`}
          value={form.currency}
          onChange={(e) => patch({ currency: e.target.value })}
          placeholder="USD"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-started`}>Start date</Label>
        <Input
          id={`${idPrefix}-started`}
          type="date"
          value={form.started_at}
          onChange={(e) => patch({ started_at: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-renews`}>Renews / expires</Label>
        <Input
          id={`${idPrefix}-renews`}
          type="date"
          value={form.renews_at}
          onChange={(e) => patch({ renews_at: e.target.value })}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-login`}>Login URL</Label>
        <Input
          id={`${idPrefix}-login`}
          type="url"
          value={form.login_url}
          onChange={(e) => patch({ login_url: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-notes`}>Notes</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          value={form.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
}

export function SubscriptionsManager({
  subscriptions,
}: {
  subscriptions: Subscription[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);

  const summary = useMemo(
    () => summarizeSubscriptions(subscriptions),
    [subscriptions],
  );

  const getSortValue = useCallback(sortValue, []);
  const {
    sorted,
    sortKey,
    sortDir,
    toggleSort: toggleSubscriptionSort,
  } = useSort<Subscription, SortKey>(
    subscriptions,
    "renews_at",
    "asc",
    getSortValue,
  );
  const pagination = usePagination(sorted);

  function toggleSort(key: SortKey) {
    toggleSubscriptionSort(key);
    pagination.setPage(1);
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    appendFormFields(fd, createForm);
    startTransition(async () => {
      const result = await createSubscription(fd);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Subscription created");
      setCreateForm(EMPTY_FORM);
      router.refresh();
    });
  }

  function openEdit(sub: Subscription) {
    setEditing(sub);
    setEditForm(toFormState(sub));
  }

  function onUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData();
    fd.set("id", editing.id);
    appendFormFields(fd, editForm);
    startTransition(async () => {
      const result = await updateSubscription(fd);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Subscription updated");
      setEditing(null);
      router.refresh();
    });
  }

  const metrics = [
    {
      label: "Monthly fee",
      value: formatCurrency(summary.monthlyFee),
    },
    {
      label: "Active tools",
      value: formatNumber(summary.activeTools),
    },
    {
      label: "Active servers",
      value: formatNumber(summary.activeServers),
    },
    {
      label: "Total active",
      value: formatNumber(summary.totalActive),
    },
    {
      label: "Renewing soon",
      value: formatNumber(summary.renewingSoon),
    },
    {
      label: "Past due",
      value: formatNumber(summary.pastDue),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Subscriptions</h1>
        <p className="page-subtitle">
          Track tools and servers across the org — independent of brands.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="metric-value">{metric.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add subscription</CardTitle>
          <CardDescription>
            Log a tool or server with cost and renewal date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="space-y-4">
            <SubscriptionFields
              form={createForm}
              setForm={setCreateForm}
              idPrefix="create"
            />
            <Button type="submit" disabled={pending}>
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
          <CardDescription>
            {subscriptions.length} subscription
            {subscriptions.length === 1 ? "" : "s"} · click a column header to
            sort
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subscriptions yet. Add a tool or server above.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead
                      label="Name"
                      sortKey="name"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="Type"
                      sortKey="kind"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="Vendor"
                      sortKey="vendor"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="Cost"
                      sortKey="cost"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="Renews"
                      sortKey="renews_at"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableHead
                      label="Status"
                      sortKey="status"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.pageItems.map((sub) => (
                    <SubscriptionRow
                      key={sub.id}
                      subscription={sub}
                      onEdit={() => openEdit(sub)}
                    />
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                id="subscriptions-page-size"
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
        open={editing != null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit subscription</DialogTitle>
          </DialogHeader>
          <form onSubmit={onUpdate} className="space-y-4">
            <SubscriptionFields
              form={editForm}
              setForm={setEditForm}
              idPrefix="edit"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubscriptionRow({
  subscription,
  onEdit,
}: {
  subscription: Subscription;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const urgency = renewalUrgency(
    subscription.renews_at,
    subscription.status,
  );
  const canRenew = subscription.billing_cycle !== "one_time";

  function remove() {
    const fd = new FormData();
    fd.set("id", subscription.id);
    startTransition(async () => {
      const result = await deleteSubscription(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Subscription deleted");
        setConfirmOpen(false);
        router.refresh();
      }
    });
  }

  function renew() {
    const fd = new FormData();
    fd.set("id", subscription.id);
    startTransition(async () => {
      const result = await renewSubscription(fd);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Renewed — next date ${result.renews_at}`);
      router.refresh();
    });
  }

  const costLabel =
    subscription.cost == null
      ? "—"
      : `${formatCurrency(Number(subscription.cost))} / ${formatCycle(subscription.billing_cycle)}`;

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{subscription.name}</div>
        {subscription.login_url ? (
          <a
            href={subscription.login_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground hover:underline"
          >
            Login
          </a>
        ) : null}
      </TableCell>
      <TableCell>{formatKind(subscription.kind)}</TableCell>
      <TableCell className="text-muted-foreground">
        {subscription.vendor || "—"}
      </TableCell>
      <TableCell>{costLabel}</TableCell>
      <TableCell
        className={cn(
          urgency === "past_due" && "font-medium text-destructive",
          urgency === "soon" && "font-medium text-amber-600 dark:text-amber-400",
        )}
      >
        {subscription.renews_at || "—"}
      </TableCell>
      <TableCell className="capitalize">{subscription.status}</TableCell>
      <TableCell className="space-x-2 text-right">
        <Button
          size="sm"
          variant="outline"
          onClick={renew}
          disabled={pending || !canRenew}
          title={
            canRenew
              ? "Advance renew date by one billing period"
              : "One-time subscriptions have no renewal period"
          }
        >
          Renew
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit}>
          Edit
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
        >
          Delete
        </Button>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete subscription?"
          description={`This will permanently remove “${subscription.name}”.`}
          pending={pending}
          onConfirm={remove}
        />
      </TableCell>
    </TableRow>
  );
}
