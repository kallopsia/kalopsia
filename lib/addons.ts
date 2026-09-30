import { cache } from "react";
import type { AddonKategori, AddonTipe, ProductAddonRow, ResolvedAddon } from "@/types/addon";
import type { ScreenCategory } from "@/lib/screen-category";
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
    harga_14: Number(row.harga_14) || 0,
    harga_15: Number(row.harga_15) || 0,
    harga_16: Number(row.harga_16) || 0,
  }));
}

// Harga add-on untuk ukuran layar tertentu. Bila harga ukuran belum ditetapkan
// (0) atau produk belum terkategori, jatuh ke harga default (fallback).
export function resolveAddonPrice(
  addon: ProductAddonRow,
  kategoriLayar: ScreenCategory
): { harga: number; fallback: boolean } {
  const sizePrice =
    kategoriLayar === "14"
      ? addon.harga_14
      : kategoriLayar === "15"
        ? addon.harga_15
        : kategoriLayar === "16"
          ? addon.harga_16
          : 0;
  if (sizePrice > 0) return { harga: sizePrice, fallback: false };
  return { harga: addon.harga, fallback: true };
}

export function resolveAddonsForScreen(
  addons: ProductAddonRow[],
  kategoriLayar: ScreenCategory
): ResolvedAddon[] {
  return addons.map((addon) => {
    const resolved = resolveAddonPrice(addon, kategoriLayar);
    return {
      id: addon.id,
      kategori: addon.kategori,
      tipe: addon.tipe,
      harga: resolved.harga,
      fallback: resolved.fallback,
    };
  });
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
