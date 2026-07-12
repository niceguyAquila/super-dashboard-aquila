"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBrand, deleteBrand, updateBrand } from "@/lib/actions/brands";
import type { Brand } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type BrandSortKey = "name" | "slug";

function brandSortValue(brand: Brand, key: BrandSortKey): string {
  return key === "name" ? brand.name.toLowerCase() : brand.slug.toLowerCase();
}

export function BrandsManager({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");

  const getBrandSortValue = useCallback(brandSortValue, []);
  const {
    sorted,
    sortKey,
    sortDir,
    toggleSort: toggleBrandSort,
  } = useSort<Brand, BrandSortKey>(brands, "name", "asc", getBrandSortValue);
  const pagination = usePagination(sorted);

  function toggleSort(key: BrandSortKey) {
    toggleBrandSort(key);
    pagination.setPage(1);
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("name", name);
    startTransition(async () => {
      const result = await createBrand(fd);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Brand created");
      setName("");
      if (result.data?.slug) {
        router.push(`/${result.data.slug}/domains`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Brands</h1>
        <p className="page-subtitle">
          Each brand has its own domain inventory and ADS dashboard.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add brand</CardTitle>
          <CardDescription>Create a new brand workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={onCreate}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="brand-name">Name</Label>
              <Input
                id="brand-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Media"
                required
              />
            </div>
            <Button type="submit" disabled={pending}>
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your brands</CardTitle>
          <CardDescription>
            {brands.length} brand{brands.length === 1 ? "" : "s"} · click a
            column header to sort
          </CardDescription>
        </CardHeader>
        <CardContent>
          {brands.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No brands yet. Create one to get started.
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
                      label="Slug"
                      sortKey="slug"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.pageItems.map((brand) => (
                    <BrandRow key={brand.id} brand={brand} />
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                id="brands-page-size"
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
    </div>
  );
}

function BrandRow({ brand }: { brand: Brand }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(brand.name);
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  function save() {
    const fd = new FormData();
    fd.set("id", brand.id);
    fd.set("name", name);
    startTransition(async () => {
      const result = await updateBrand(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Brand updated");
        setEditing(false);
        router.refresh();
      }
    });
  }

  function remove() {
    const fd = new FormData();
    fd.set("id", brand.id);
    startTransition(async () => {
      const result = await deleteBrand(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Brand deleted");
        setConfirmOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <TableRow>
      <TableCell>
        {editing ? (
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        ) : (
          <button
            type="button"
            className="font-medium hover:underline"
            onClick={() => router.push(`/${brand.slug}/domains`)}
          >
            {brand.name}
          </button>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">{brand.slug}</TableCell>
      <TableCell className="space-x-2 text-right">
        {editing ? (
          <>
            <Button size="sm" onClick={save} disabled={pending}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setName(brand.name);
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Rename
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
              disabled={pending}
            >
              Delete
            </Button>
          </>
        )}
      </TableCell>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete brand?"
        description={`This will permanently remove “${brand.name}” and all of its domains and ADS data.`}
        pending={pending}
        onConfirm={remove}
      />
    </TableRow>
  );
}
