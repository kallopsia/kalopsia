import { cache } from "react";
import type { Product, ProductRow } from "@/types/product";
import {
  getSupabaseReadClient,
  PRODUCTS_CACHE_TAG,
  PRODUCTS_REVALIDATE_SECONDS,
} from "@/lib/supabase/server";
import { collectKategori, productSlug, toProduct } from "./product-view";
import type { PhotoRef } from "./photo-url";

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

// Satu query untuk semua foto, digabung di JS. Tidak di-embed ke products supaya
// katalog tetap jalan kalau tabel product_photos belum ada (migrasi belum jalan).
type PhotoIndex = Record<string, PhotoRef[]>;

const getPhotoIndex = cache(async (): Promise<PhotoIndex> => {
  const supabase = getSupabaseReadClient();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from("product_photos")
    .select("product_id,public_id,posisi")
    .order("posisi", { ascending: true });

  if (error) {
    console.warn(`[products] foto tambahan tidak terbaca: ${error.message}`);
    return {};
  }

  const index: PhotoIndex = {};
  ((data || []) as { product_id: string; public_id: string; posisi: number }[]).forEach((row) => {
    const list = index[row.product_id] || (index[row.product_id] = []);
    list.push({ public_id: row.public_id, posisi: row.posisi });
  });
  return index;
});

// Semua produk aktif (termasuk setiap varian warna), urut kode_barang ascending.
// Dipakai sebagai sumber untuk collapse grup & resolusi slug varian.
export const getCatalogProducts = cache(async (): Promise<Product[]> => {
  const [state, photos] = await Promise.all([getCatalogState(), getPhotoIndex()]);
  return state.rows.map((row) => toProduct(row, photos[row.id]));
});

// Kunci tampilan sebuah produk di listing: slug grup bila tergabung, else slug sendiri.
function listingKey(product: Product): string {
  return product.groupSlug || product.slug;
}

// Daftar untuk storefront (shop/landing): satu entri per grup varian.
// Perwakilan = produk dengan kode_barang terendah; karena getCatalogProducts
// sudah urut ascending, kemunculan pertama tiap kunci adalah perwakilannya.
export const getProducts = cache(async (): Promise<Product[]> => {
  const products = await getCatalogProducts();
  const seen = new Set<string>();
  const collapsed: Product[] = [];
  for (const product of products) {
    const key = listingKey(product);
    if (seen.has(key)) continue;
    seen.add(key);
    collapsed.push(product);
  }
  return collapsed;
});

// Produk unggulan untuk landing page: baris dengan is_featured=true, urut kode
// barang, maksimal 8. Selama admin belum menandai satupun produk, delapan
// produk aktif pertama dipakai supaya landing tidak kosong melompong.
export const LANDING_SHOWCASE_SIZE = 8;

export const getFeaturedProducts = cache(async (): Promise<Product[]> => {
  const [state, photos] = await Promise.all([getCatalogState(), getPhotoIndex()]);
  const mapped = state.rows.map((row) => toProduct(row, photos[row.id]));
  const featured = mapped.filter((product, index) => {
    const row = state.rows[index];
    return row.is_featured === true;
  });
  const source = featured.length > 0 ? featured : mapped;

  // Collapse grup varian supaya landing tidak menampilkan warna yang sama dua kali.
  const seen = new Set<string>();
  const collapsed: Product[] = [];
  for (const product of source) {
    const key = listingKey(product);
    if (seen.has(key)) continue;
    seen.add(key);
    collapsed.push(product);
    if (collapsed.length >= LANDING_SHOWCASE_SIZE) break;
  }
  return collapsed;
});

export async function getCatalogStatus(): Promise<CatalogStatus> {
  const state = await getCatalogState();
  return state.status;
}

// Cari produk berdasarkan slug apa pun (perwakilan maupun anggota varian).
export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  const products = await getCatalogProducts();
  return products.find((product) => product.slug === slug) || null;
});

// Semua anggota grup varian untuk sebuah slug (perwakilan di urutan pertama).
// Produk tunggal (tanpa grup) dikembalikan sebagai array berisi dirinya sendiri.
export const getVariantGroup = cache(async (slug: string): Promise<Product[] | null> => {
  const products = await getCatalogProducts();
  const product = products.find((item) => item.slug === slug);
  if (!product) return null;

  const groupSlug = product.groupSlug;
  if (!groupSlug) return [product];

  const members = products.filter((item) => item.groupSlug === groupSlug);
  // Perwakilan (slug === groupSlug) di depan, sisanya urut kode_barang.
  return members.sort((a, b) => {
    if (a.slug === groupSlug) return -1;
    if (b.slug === groupSlug) return 1;
    return a.kodeBarang.localeCompare(b.kodeBarang);
  });
});

export async function getAllProductSlugs(): Promise<string[]> {
  const products = await getCatalogProducts();
  return Array.from(new Set(products.map((product) => product.slug)));
}

export function slugFromKode(kodeBarang: string): string {
  return productSlug(kodeBarang);
}
