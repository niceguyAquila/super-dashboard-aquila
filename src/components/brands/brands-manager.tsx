"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBrand, deleteBrand, updateBrand } from "@/lib/actions/brands";
import type { Brand } from "@/lib/types";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function BrandsManager({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");

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
          <form onSubmit={onCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
        </CardHeader>
        <CardContent>
          {brands.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No brands yet. Create one to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.map((brand) => (
                  <BrandRow key={brand.id} brand={brand} />
                ))}
              </TableBody>
            </Table>
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
    if (!confirm(`Delete brand “${brand.name}”? This removes its domains and ADS data.`)) {
      return;
    }
    const fd = new FormData();
    fd.set("id", brand.id);
    startTransition(async () => {
      const result = await deleteBrand(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Brand deleted");
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
            <Button size="sm" variant="destructive" onClick={remove} disabled={pending}>
              Delete
            </Button>
          </>
        )}
      </TableCell>
    </TableRow>
  );
}
