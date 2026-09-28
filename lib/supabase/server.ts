import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const SUPABASE_MISSING_MESSAGE =
  "Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local (lihat docs/SETUP.md).";

// Klien berbasis cookie untuk area admin: auth + RLS mengikuti user yang login.
export function createSupabaseServerClient(): SupabaseClient {
  if (!isSupabaseConfigured) throw new Error(SUPABASE_MISSING_MESSAGE);

  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Dipanggil dari Server Component; penyegaran sesi ditangani middleware.
        }
      },
    },
  });
}

// Klien baca (anon) untuk storefront: tanpa cookie agar hasil bisa di-cache ISR.
let readClient: SupabaseClient | null = null;

export const PRODUCTS_CACHE_TAG = "products";
export const PRODUCTS_REVALIDATE_SECONDS = 3600;

type NextFetchInit = RequestInit & { next?: { tags?: string[]; revalidate?: number } };

export function getSupabaseReadClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!readClient) {
    readClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            next: {
              tags: [PRODUCTS_CACHE_TAG],
              revalidate: PRODUCTS_REVALIDATE_SECONDS,
            },
          } as NextFetchInit),
      },
    });
  }
  return readClient;
}
