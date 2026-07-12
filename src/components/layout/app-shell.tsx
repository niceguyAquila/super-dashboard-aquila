"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  Globe2,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Brand, Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type AppShellProps = {
  brands: Brand[];
  activeBrand?: Brand | null;
  profile?: Profile | null;
  children: React.ReactNode;
};

export function AppShell({
  brands,
  activeBrand,
  profile,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isSuperAdmin = profile?.role === "super_admin";

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const brandBase = activeBrand ? `/${activeBrand.slug}` : null;

  const nav = activeBrand
    ? [
        {
          href: `${brandBase}/domains`,
          label: "Domains",
          icon: Globe2,
          match: "/domains",
        },
        {
          href: `${brandBase}/ads`,
          label: "ADS",
          icon: Megaphone,
          match: "/ads",
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f5f0_0%,#ffffff_28%,#f0f7f4_100%)]">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <LayoutDashboard className="size-4 text-emerald-700" />
            <span>Brand Work</span>
          </Link>

          <div className="ml-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <span className="max-w-[160px] truncate">
                      {activeBrand?.name ?? "Select brand"}
                    </span>
                    <ChevronDown className="size-3.5 opacity-60" />
                  </Button>
                }
              />
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Brands</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {brands.length === 0 && (
                  <DropdownMenuItem disabled>No brands yet</DropdownMenuItem>
                )}
                {brands.map((brand) => (
                  <DropdownMenuItem
                    key={brand.id}
                    onClick={() => router.push(`/${brand.slug}/domains`)}
                  >
                    {brand.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/settings/brands")}>
                  <Settings className="size-4" />
                  Manage brands
                </DropdownMenuItem>
                {isSuperAdmin && (
                  <DropdownMenuItem
                    onClick={() => router.push("/settings/users")}
                  >
                    <Users className="size-4" />
                    Manage users
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <nav className="ml-4 hidden items-center gap-1 sm:flex">
            {nav.map((item) => {
              const active = pathname.includes(item.match);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-emerald-900 text-emerald-50"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {profile?.username && (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {profile.username}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
