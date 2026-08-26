"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  CreditCard,
  Globe2,
  LogOut,
  Menu,
  Settings,
  Share2,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Brand, Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type AppShellProps = {
  brands: Brand[];
  activeBrand?: Brand | null;
  profile?: Profile | null;
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: typeof Globe2;
  match: string;
};

function Wordmark({
  className,
  tone = "content",
}: {
  className?: string;
  tone?: "content" | "rail";
}) {
  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-2.5", className)}
    >
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-sm bg-nav-active"
      />
      <span
        className={cn(
          "font-display text-[1.2rem] font-semibold leading-tight tracking-tight",
          tone === "rail" ? "text-sidebar-foreground" : "text-foreground",
        )}
      >
        Aquila Dashboard
      </span>
    </Link>
  );
}

function RailNav({
  nav,
  pathname,
  onNavigate,
}: {
  nav: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  if (nav.length === 0) return null;

  return (
    <nav className="flex flex-col gap-0.5">
      {nav.map((item) => {
        const active = pathname.includes(item.match);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[0.9rem] font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/55 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
            )}
          >
            {active && (
              <span
                aria-hidden
                className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-nav-active"
              />
            )}
            <Icon className="size-4 shrink-0 opacity-80" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function BrandSwitcher({
  brands,
  activeBrand,
  onSelect,
  className,
}: {
  brands: Brand[];
  activeBrand?: Brand | null;
  onSelect: (href: string) => void;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full justify-between gap-1.5 border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              className,
            )}
          >
            <span className="truncate">
              {activeBrand?.name ?? "Select brand"}
            </span>
            <ChevronDown className="size-3.5 shrink-0 opacity-60" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Brands</DropdownMenuLabel>
          {brands.length === 0 && (
            <DropdownMenuItem disabled>No brands yet</DropdownMenuItem>
          )}
          {brands.map((brand) => (
            <DropdownMenuItem
              key={brand.id}
              onClick={() => onSelect(`/${brand.slug}/domains`)}
            >
              {brand.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RailFooter({
  isSuperAdmin,
  username,
  onNavigate,
  onSignOut,
}: {
  isSuperAdmin: boolean;
  username?: string | null;
  onNavigate: (href: string) => void;
  onSignOut: () => void;
}) {
  return (
    <div className="mt-auto space-y-3 border-t border-sidebar-border pt-4">
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => onNavigate("/settings/brands")}
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-[0.875rem] text-sidebar-foreground/55 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Settings className="size-4 shrink-0" />
          Manage brands
        </button>
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => onNavigate("/settings/users")}
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-[0.875rem] text-sidebar-foreground/55 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <Users className="size-4 shrink-0" />
            Manage users
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 px-1">
        {username && (
          <span className="min-w-0 flex-1 truncate text-sm text-sidebar-foreground/50">
            {username}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={onSignOut}
        >
          <LogOut className="size-3.5" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

function RailBody({
  brands,
  activeBrand,
  nav,
  pathname,
  isSuperAdmin,
  username,
  onNavigate,
  onSignOut,
  onClose,
}: {
  brands: Brand[];
  activeBrand?: Brand | null;
  nav: NavItem[];
  pathname: string;
  isSuperAdmin: boolean;
  username?: string | null;
  onNavigate: (href: string) => void;
  onSignOut: () => void;
  onClose?: () => void;
}) {
  const subscriptionsActive = pathname.startsWith("/settings/subscriptions");

  return (
    <div className="flex h-full flex-col gap-6 p-5 text-sidebar-foreground">
      <Wordmark tone="rail" />

      <nav className="flex flex-col gap-0.5">
        <Link
          href="/settings/subscriptions"
          onClick={onClose}
          className={cn(
            "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[0.9rem] font-medium transition-colors",
            subscriptionsActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/55 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
          )}
        >
          {subscriptionsActive && (
            <span
              aria-hidden
              className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-nav-active"
            />
          )}
          <CreditCard className="size-4 shrink-0 opacity-80" />
          Subscriptions
        </Link>
      </nav>

      <div className="space-y-2">
        <p className="px-1 text-[0.7rem] font-medium uppercase tracking-wide text-sidebar-foreground/45">
          Domains
        </p>
        <BrandSwitcher
          brands={brands}
          activeBrand={activeBrand}
          onSelect={onNavigate}
        />
      </div>

      <RailNav nav={nav} pathname={pathname} onNavigate={onClose} />

      <RailFooter
        isSuperAdmin={isSuperAdmin}
        username={username}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
      />
    </div>
  );
}

export function AppShell({
  brands,
  activeBrand,
  profile,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isSuperAdmin = profile?.role === "super_admin";
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function goTo(href: string) {
    setMobileOpen(false);
    router.push(href);
  }

  const brandBase = activeBrand ? `/${activeBrand.slug}` : null;

  const nav: NavItem[] = activeBrand
    ? [
        {
          href: `${brandBase}/domains`,
          label: "Domains",
          icon: Globe2,
          match: "/domains",
        },
        {
          href: `${brandBase}/social`,
          label: "Social",
          icon: Share2,
          match: "/social",
        },
      ]
    : [];

  return (
    <div className="flex min-h-screen bg-shell-bg">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        <RailBody
          brands={brands}
          activeBrand={activeBrand}
          nav={nav}
          pathname={pathname}
          isSuperAdmin={isSuperAdmin}
          username={profile?.username}
          onNavigate={goTo}
          onSignOut={signOut}
        />
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </Button>
            <SheetContent
              side="left"
              className="w-[220px] max-w-[220px] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
              showCloseButton
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <RailBody
                brands={brands}
                activeBrand={activeBrand}
                nav={nav}
                pathname={pathname}
                isSuperAdmin={isSuperAdmin}
                username={profile?.username}
                onNavigate={goTo}
                onSignOut={signOut}
                onClose={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <Wordmark className="min-w-0" />
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
