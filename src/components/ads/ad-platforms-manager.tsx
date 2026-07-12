"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import {
  createAdPlatform,
  deleteAdPlatform,
  updateAdPlatform,
} from "@/lib/actions/ad-platforms";
import type { AdPlatform, Brand } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
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

export function AdPlatformsManager({
  brand,
  platforms,
}: {
  brand: Brand;
  platforms: AdPlatform[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<AdPlatform | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("brandId", brand.id);
    fd.set("brandSlug", brand.slug);
    fd.set("name", name);
    startTransition(async () => {
      const result = await createAdPlatform(fd);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Platform added");
      setName("");
      router.refresh();
    });
  }

  function toggleActive(platform: AdPlatform) {
    const fd = new FormData();
    fd.set("id", platform.id);
    fd.set("brandSlug", brand.slug);
    fd.set("isActive", platform.is_active ? "false" : "true");
    startTransition(async () => {
      const result = await updateAdPlatform(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success(
          platform.is_active ? "Platform deactivated" : "Platform activated",
        );
        router.refresh();
      }
    });
  }

  function onRename(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData();
    fd.set("id", editing.id);
    fd.set("brandSlug", brand.slug);
    fd.set("name", editName);
    startTransition(async () => {
      const result = await updateAdPlatform(fd);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Platform renamed");
      setEditing(null);
      router.refresh();
    });
  }

  function remove() {
    if (!deleteId) return;
    const fd = new FormData();
    fd.set("id", deleteId);
    fd.set("brandSlug", brand.slug);
    startTransition(async () => {
      const result = await deleteAdPlatform(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Platform deleted");
        setDeleteId(null);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Ad platforms</CardTitle>
          <CardDescription>
            Add platforms for this brand and toggle which are active. Only
            active platforms appear when logging spend, regs, and deposits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={onCreate}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="platform-name">Platform name</Label>
              <Input
                id="platform-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Propeller Ads"
                required
              />
            </div>
            <Button type="submit" disabled={pending}>
              Add platform
            </Button>
          </form>

          {platforms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No platforms yet. Add one (e.g. Propeller Ads, Rich Ads) to start
              logging performance.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platforms.map((platform) => (
                  <TableRow key={platform.id}>
                    <TableCell className="font-medium">{platform.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={platform.is_active ? "default" : "secondary"}
                      >
                        {platform.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => toggleActive(platform)}
                        >
                          {platform.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => {
                            setEditing(platform);
                            setEditName(platform.name);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => setDeleteId(platform.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename platform</DialogTitle>
          </DialogHeader>
          <form onSubmit={onRename} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-platform-name">Name</Label>
              <Input
                id="edit-platform-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              Save name
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete platform?"
        description="This permanently removes the platform and all of its ADS entries."
        pending={pending}
        onConfirm={remove}
      />
    </>
  );
}
