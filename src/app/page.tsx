import { redirect } from "next/navigation";
import Link from "next/link";
import { getBrands } from "@/lib/actions/brands";
import { getCurrentProfile } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function HomePage() {
  const [brands, profile] = await Promise.all([
    getBrands(),
    getCurrentProfile(),
  ]);

  if (brands.length === 1) {
    redirect(`/${brands[0].slug}/domains`);
  }

  return (
    <AppShell brands={brands} activeBrand={null} profile={profile}>
      <div className="space-y-6">
        <div>
          <h1 className="page-title">
            Choose a brand
          </h1>
          <p className="page-subtitle">
            Open a brand workspace or create a new one.
          </p>
        </div>

        {brands.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No brands yet</CardTitle>
              <CardDescription>
                Create your first brand to start tracking domains and ADS.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/settings/brands" />}>
                Create a brand
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <Link key={brand.id} href={`/${brand.slug}/domains`}>
                <Card className="border-border transition-colors hover:border-nav-active/50 hover:bg-accent">
                  <CardHeader>
                    <CardTitle>{brand.name}</CardTitle>
                    <CardDescription>/{brand.slug}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
