import { notFound } from "next/navigation";
import { getBrandBySlug, getBrands } from "@/lib/actions/brands";
import { getCurrentProfile } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ brandSlug: string }>;
};

export default async function BrandLayout({ children, params }: LayoutProps) {
  const { brandSlug } = await params;

  if (!brandSlug?.trim()) notFound();

  const [brands, brand, profile] = await Promise.all([
    getBrands(),
    getBrandBySlug(brandSlug),
    getCurrentProfile(),
  ]);

  if (!brand) notFound();

  return (
    <AppShell brands={brands} activeBrand={brand} profile={profile}>
      {children}
    </AppShell>
  );
}
