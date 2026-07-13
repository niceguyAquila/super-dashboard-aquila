"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { bootstrapSuperAdmin } from "@/lib/actions/users";
import {
  isValidUsername,
  normalizeUsername,
  usernameToEmail,
} from "@/lib/auth/username";
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

type LoginFormProps = {
  needsSetup: boolean;
};

export function LoginForm({ needsSetup }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const normalized = normalizeUsername(username);
    if (!isValidUsername(normalized)) {
      setMessage("Enter a valid username.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(normalized),
      password,
    });

    if (error) {
      setMessage("Invalid username or password.");
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  function onBootstrap(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const fd = new FormData();
    fd.set("username", username);
    fd.set("password", password);
    startTransition(async () => {
      const result = await bootstrapSuperAdmin(fd);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      // Sign in after creating the first admin
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(normalizeUsername(username)),
        password,
      });
      if (error) {
        setMessage("Admin created. Please sign in.");
        return;
      }
      window.location.href = "/";
    });
  }

  if (needsSetup) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-2xl font-semibold tracking-tight">
            Initial setup
          </CardTitle>
          <CardDescription>
            Create the first super admin account. After this, only that admin
            can create more users — there is no public sign up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onBootstrap} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                required
                minLength={3}
                maxLength={32}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {message && (
              <p className="text-sm text-destructive">{message}</p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Creating…" : "Create super admin"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-display text-2xl font-semibold tracking-tight">
          Aquila Dashboard
        </CardTitle>
        <CardDescription>
          Sign in with the username and password provided by your admin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {message && <p className="text-sm text-destructive">{message}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
