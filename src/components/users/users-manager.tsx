"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createUserAccount,
  deleteUserAccount,
  resetUserPassword,
} from "@/lib/actions/users";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

export function UsersManager({
  users,
  currentUserId,
}: {
  users: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "super_admin">("user");

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("username", username);
    fd.set("password", password);
    fd.set("role", role);
    startTransition(async () => {
      const result = await createUserAccount(fd);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("User created");
      setUsername("");
      setPassword("");
      setRole("user");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Users</h1>
        <p className="page-subtitle">
          Only super admins can create accounts. There is no public sign up.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>
            New users sign in with the username and password you set here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={onCreate}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
          >
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="operator"
                required
                minLength={3}
                maxLength={32}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "user" | "super_admin")
                }
              >
                <option value="user">User</option>
                <option value="super_admin">Super admin</option>
              </select>
            </div>
            <Button type="submit" disabled={pending}>
              Create user
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isSelf={user.id === currentUserId}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function UserRow({ user, isSelf }: { user: Profile; isSelf: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  function onDelete() {
    if (!confirm(`Delete user “${user.username}”?`)) return;
    const fd = new FormData();
    fd.set("id", user.id);
    startTransition(async () => {
      const result = await deleteUserAccount(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success("User deleted");
        router.refresh();
      }
    });
  }

  function onReset(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("id", user.id);
    fd.set("password", newPassword);
    startTransition(async () => {
      const result = await resetUserPassword(fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Password updated");
        setResetOpen(false);
        setNewPassword("");
      }
    });
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {user.username}
        {isSelf && (
          <Badge variant="secondary" className="ml-2">
            You
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={user.role === "super_admin" ? "default" : "outline"}>
          {user.role === "super_admin" ? "Super admin" : "User"}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {new Date(user.created_at).toLocaleDateString()}
      </TableCell>
      <TableCell className="space-x-2 text-right">
        {resetOpen ? (
          <form
            onSubmit={onReset}
            className="inline-flex items-center gap-2"
          >
            <Input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
              className="h-8 w-40"
            />
            <Button size="sm" type="submit" disabled={pending}>
              Save
            </Button>
            <Button
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => setResetOpen(false)}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setResetOpen(true)}
            >
              Reset password
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onDelete}
              disabled={pending || isSelf}
            >
              Delete
            </Button>
          </>
        )}
      </TableCell>
    </TableRow>
  );
}
