import { getBrands } from "@/lib/actions/brands";
import { getSubscriptions } from "@/lib/actions/subscriptions";
import { getCurrentProfile } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { SubscriptionsManager } from "@/components/subscriptions/subscriptions-manager";

export default async function SubscriptionsSettingsPage() {
  const [brands, profile, subscriptions] = await Promise.all([
    getBrands(),
    getCurrentProfile(),
    getSubscriptions(),
  ]);

  return (
    <AppShell brands={brands} activeBrand={null} profile={profile}>
      <SubscriptionsManager subscriptions={subscriptions} />
    </AppShell>
  );
}
