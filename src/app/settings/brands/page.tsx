import { getBrands } from "@/lib/actions/brands";
import { getCurrentProfile } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { BrandsManager } from "@/components/brands/brands-manager";

export default async function BrandsSettingsPage() {
  const [brands, profile] = await Promise.all([
    getBrands(),
    getCurrentProfile(),
  ]);

  return (
    <AppShell brands={brands} activeBrand={null} profile={profile}>
      <BrandsManager brands={brands} />
    </AppShell>
  );
}
