import { cache } from "react";
import type { Product, ProductRow } from "@/types/product";
import {
  getSupabaseReadClient,
  PRODUCTS_CACHE_TAG,
  PRODUCTS_REVALIDATE_SECONDS,
} from "@/lib/supabase/server";
import { collectKategori, productSlug, toProduct } from "./product-view";
import snapshotRows from "@/data/products.json";

export { PRODUCTS_CACHE_TAG, PRODUCTS_REVALIDATE_SECONDS, collectKategori };

// Snapshot hasil `npm run db:seed -- --snapshot-only`: dipakai bila Supabase
// belum dikonfigurasi (mis. saat development awal) supaya toko tetap tampil.
const fallbackRows = snapshotRows as unknown as ProductRow[];

async function fetchActiveRows(): Promise<ProductRow[]> {
  const supabase = getSupabaseReadClient();
  if (!supabase) return fallbackRows;

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("kode_barang", { ascending: true });

  if (error) {
    console.warn(
      `[products] gagal membaca Supabase (${error.message}), memakai snapshot data/products.json`
    );
    return fallbackRows;
  }

  const rows = (data || []) as unknown as ProductRow[];
  return rows.length > 0 ? rows : fallbackRows;
}

export const getProducts = cache(async (): Promise<Product[]> => {
  const rows = await fetchActiveRows();
  return rows.map(toProduct);
});

export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  const products = await getProducts();
  return products.find((product) => product.slug === slug) || null;
});

export async function getAllProductSlugs(): Promise<string[]> {
  const products = await getProducts();
  return Array.from(new Set(products.map((product) => product.slug)));
}

export function slugFromKode(kodeBarang: string): string {
  return productSlug(kodeBarang);
}
