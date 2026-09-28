import { cache } from "react";
import type { Product, ProductRow } from "@/types/product";
import {
  getSupabaseReadClient,
  PRODUCTS_CACHE_TAG,
  PRODUCTS_REVALIDATE_SECONDS,
} from "@/lib/supabase/server";
import { collectKategori, productSlug, toProduct } from "./product-view";

export { PRODUCTS_CACHE_TAG, PRODUCTS_REVALIDATE_SECONDS, collectKategori };

// "unconfigured": env Supabase belum diisi. "error": query ke Supabase gagal.
// Keduanya ditampilkan apa adanya di storefront (katalog kosong), tanpa produk
// dummy, supaya kondisi database selalu terlihat jujur.
export type CatalogStatus = "ok" | "empty" | "unconfigured" | "error";

type CatalogState = {
  rows: ProductRow[];
  status: CatalogStatus;
};

const getCatalogState = cache(async (): Promise<CatalogState> => {
  const supabase = getSupabaseReadClient();
  if (!supabase) return { rows: [], status: "unconfigured" };

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("kode_barang", { ascending: true });

  if (error) {
    console.warn(`[products] gagal membaca Supabase: ${error.message}`);
    return { rows: [], status: "error" };
  }

  const rows = (data || []) as unknown as ProductRow[];
  return { rows, status: rows.length > 0 ? "ok" : "empty" };
});

export const getProducts = cache(async (): Promise<Product[]> => {
  const state = await getCatalogState();
  return state.rows.map(toProduct);
});

// Produk unggulan untuk landing page: baris dengan is_featured=true, urut kode
// barang, maksimal 8. Selama admin belum menandai satupun produk, delapan
// produk aktif pertama dipakai supaya landing tidak kosong melompong.
export const LANDING_SHOWCASE_SIZE = 8;

export const getFeaturedProducts = cache(async (): Promise<Product[]> => {
  const state = await getCatalogState();
  const featured = state.rows.filter((row) => row.is_featured === true);
  const source =
    featured.length > 0 ? featured : state.rows.slice(0, LANDING_SHOWCASE_SIZE);
  return source.slice(0, LANDING_SHOWCASE_SIZE).map(toProduct);
});

export async function getCatalogStatus(): Promise<CatalogStatus> {
  const state = await getCatalogState();
  return state.status;
}

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
