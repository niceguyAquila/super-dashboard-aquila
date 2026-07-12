import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import type { Profile, UserRole } from "@/lib/types";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data;
}

export async function requireSuperAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") {
    throw new Error("Forbidden");
  }
  return profile;
}

export async function countProfiles(): Promise<number> {
  const admin = createServiceClient();
  const { count, error } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function createAuthUser(options: {
  username: string;
  password: string;
  role: UserRole;
  createdBy?: string | null;
}) {
  const admin = createServiceClient();
  const { usernameToEmail } = await import("@/lib/auth/username");
  const email = usernameToEmail(options.username);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: options.password,
    email_confirm: true,
    user_metadata: { username: options.username },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Failed to create user");
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    username: options.username,
    role: options.role,
    created_by: options.createdBy ?? null,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error(profileError.message);
  }

  return data.user;
}
