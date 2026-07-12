"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  countProfiles,
  createAuthUser,
  requireSuperAdmin,
} from "@/lib/auth/session";
import {
  isValidUsername,
  normalizeUsername,
} from "@/lib/auth/username";
import type { Profile, UserRole } from "@/lib/types";

export async function needsBootstrap(): Promise<boolean> {
  try {
    return (await countProfiles()) === 0;
  } catch {
    // Profiles table missing or service role not configured
    return false;
  }
}

export async function bootstrapSuperAdmin(formData: FormData) {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!isValidUsername(username)) {
    return {
      error:
        "Username must be 3–32 chars: letters, numbers, dots, underscores, or hyphens.",
    };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await countProfiles();
  if (existing > 0) {
    return { error: "Setup is already complete. Sign in instead." };
  }

  try {
    await createAuthUser({
      username,
      password,
      role: "super_admin",
      createdBy: null,
    });
    return { ok: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create admin",
    };
  }
}

export async function listUsers(): Promise<Profile[]> {
  await requireSuperAdmin();
  const admin = createServiceClient();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createUserAccount(formData: FormData) {
  const adminProfile = await requireSuperAdmin();
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "user") as UserRole;

  if (!isValidUsername(username)) {
    return {
      error:
        "Username must be 3–32 chars: letters, numbers, dots, underscores, or hyphens.",
    };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (role !== "user" && role !== "super_admin") {
    return { error: "Invalid role" };
  }

  try {
    await createAuthUser({
      username,
      password,
      role,
      createdBy: adminProfile.id,
    });
    revalidatePath("/settings/users");
    return { ok: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create user",
    };
  }
}

export async function deleteUserAccount(formData: FormData) {
  const adminProfile = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Invalid user" };
  if (id === adminProfile.id) {
    return { error: "You cannot delete your own account." };
  }

  const admin = createServiceClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { error: error.message };

  revalidatePath("/settings/users");
  return { ok: true };
}

export async function resetUserPassword(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!id) return { error: "Invalid user" };
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const admin = createServiceClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) return { error: error.message };

  revalidatePath("/settings/users");
  return { ok: true };
}
