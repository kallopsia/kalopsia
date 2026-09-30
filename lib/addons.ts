import { cache } from "react";
import type { AddonKategori, AddonTipe, ProductAddonRow } from "@/types/addon";
import { getSupabaseReadClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

const CATEGORY_ORDER: Record<AddonKategori, number> = { body: 0, layar: 1 };
const TYPE_ORDER: Record<AddonTipe, number> = { matte: 0, glossy: 1 };

export function sortAddons(rows: ProductAddonRow[]): ProductAddonRow[] {
  return [...rows].sort(
    (a, b) =>
      CATEGORY_ORDER[a.kategori] - CATEGORY_ORDER[b.kategori] ||
      TYPE_ORDER[a.tipe] - TYPE_ORDER[b.tipe]
  );
}

function normalizeRows(rows: unknown): ProductAddonRow[] {
  return ((rows || []) as ProductAddonRow[]).map((row) => ({
    ...row,
    harga: Number(row.harga) || 0,
  }));
}

// Add-on aktif untuk storefront. Gagal baca (mis. migrasi belum dijalankan)
// dianggap tidak ada add-on: halaman produk cukup menyembunyikan bagiannya.
export const getActiveAddons = cache(async (): Promise<ProductAddonRow[]> => {
  const supabase = getSupabaseReadClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("product_addons")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.warn(`[addons] gagal membaca product_addons: ${error.message}`);
    return [];
  }
  return sortAddons(normalizeRows(data));
});

export async function getAllAddons(): Promise<ProductAddonRow[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("product_addons").select("*");
  if (error) throw new Error(error.message);
  return sortAddons(normalizeRows(data));
}
