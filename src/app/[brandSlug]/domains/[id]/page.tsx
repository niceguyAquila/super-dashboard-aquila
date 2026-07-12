import { notFound } from "next/navigation";
import { getBrandBySlug, getBrands } from "@/lib/actions/brands";
import { getDomainDetail } from "@/lib/actions/domains";
import { getCurrentProfile } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { DomainDetail } from "@/components/domains/domain-detail";

type PageProps = {
  params: Promise<{ brandSlug: string; id: string }>;
};

export default async function DomainDetailPage({ params }: PageProps) {
  const { brandSlug, id } = await params;
  const [brands, brand, profile] = await Promise.all([
    getBrands(),
    getBrandBySlug(brandSlug),
    getCurrentProfile(),
  ]);

  if (!brand) notFound();

  let domain;
  try {
    domain = await getDomainDetail(id);
  } catch {
    notFound();
  }

  if (!domain || domain.brand_id !== brand.id) notFound();

  return (
    <AppShell brands={brands} activeBrand={brand} profile={profile}>
      <DomainDetail brand={brand} domain={domain} />
    </AppShell>
  );
}
