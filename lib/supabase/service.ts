import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service role melewati RLS: hanya boleh dipakai di server (API route / script).
// Kunci ini tidak pernah boleh memakai prefiks NEXT_PUBLIC_ atau dikirim ke client.
export function getSupabaseServiceClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseServiceClient hanya boleh dipanggil di server.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi di server."
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
