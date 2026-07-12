import { notFound } from "next/navigation";
import { getBrandBySlug } from "@/lib/actions/brands";
import { getDomainDetail } from "@/lib/actions/domains";
import { DomainDetail } from "@/components/domains/domain-detail";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ brandSlug: string; id: string }>;
};

export default async function DomainDetailPage({ params }: PageProps) {
  const { brandSlug, id } = await params;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  let domain;
  try {
    domain = await getDomainDetail(id);
  } catch {
    notFound();
  }

  if (!domain || domain.brand_id !== brand.id) notFound();

  return <DomainDetail brand={brand} domain={domain} />;
}
