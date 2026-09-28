import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const ADMIN_ROLE = "admin";

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  const role = (user.app_metadata as { role?: unknown } | undefined)?.role;
  return role === ADMIN_ROLE;
}

export const getAdminUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return isAdminUser(data.user) ? data.user : null;
});

// Penjaga server-side untuk semua halaman & API admin.
export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return user;
}
