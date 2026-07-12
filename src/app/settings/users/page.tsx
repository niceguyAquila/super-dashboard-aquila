import { redirect } from "next/navigation";
import { getBrands } from "@/lib/actions/brands";
import { listUsers } from "@/lib/actions/users";
import { getCurrentProfile } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { UsersManager } from "@/components/users/users-manager";

export default async function UsersSettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "super_admin") redirect("/");

  const [brands, users] = await Promise.all([getBrands(), listUsers()]);

  return (
    <AppShell brands={brands} activeBrand={null} profile={profile}>
      <UsersManager users={users} currentUserId={profile.id} />
    </AppShell>
  );
}
