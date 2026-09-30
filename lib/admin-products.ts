import { getSupabaseServiceClient } from "./supabase/service";
import type { ProductRow } from "@/types/product";
import type { ImportLogRow } from "@/types/import-log";
import type { ProductInput } from "./product-schema";
import { BRAND_FROM_CODE_SEGMENT } from "./product-view";

export const ADMIN_PER_PAGE = 25;

const SORTABLE = ["kode_barang", "spesifikasi", "srp", "created_at", "updated_at"] as const;
export type SortField = (typeof SORTABLE)[number];

export type ProductListQuery = {
  page?: number;
  perPage?: number;
  q?: string;
  status?: "all" | "active" | "inactive";
  noImage?: boolean;
  srpZero?: boolean;
  noName?: boolean;
  brand?: string;
  screen?: string;
  duplicates?: boolean;
  sort?: string;
  dir?: "asc" | "desc";
};

export type ProductListResult = {
  rows: ProductRow[];
  count: number;
  page: number;
  totalPages: number;
};

export type DashboardStats = {
  total: number;
  active: number;
  inactive: number;
  noImage: number;
  srpZero: number;
};

// PostgREST memakai koma & kurung sebagai pemisah filter `or`, jadi dibersihkan.
function sanitizeQuery(value: string): string {
  return value.replace(/[,%()"\\]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeRows(rows: unknown): ProductRow[] {
  return ((rows || []) as ProductRow[]).map((row) => ({
    ...row,
    srp: Number(row.srp) || 0,
    image_urls: row.image_urls || [],
  }));
}

export function knownBrands(): { code: string; name: string }[] {
  return Object.entries(BRAND_FROM_CODE_SEGMENT).map(([code, name]) => ({ code, name }));
}

export async function listProducts(query: ProductListQuery = {}): Promise<ProductListResult> {
  const supabase = getSupabaseServiceClient();
  const perPage = Math.min(Math.max(query.perPage || ADMIN_PER_PAGE, 1), 100);
  const page = Math.max(1, query.page || 1);
  const sortField = (SORTABLE as readonly string[]).includes(query.sort || "")
    ? (query.sort as SortField)
    : "kode_barang";
  const ascending = query.dir !== "desc";

  let request = supabase.from("products").select("*", { count: "exact" });

  const needle = sanitizeQuery(query.q || "");
  if (needle) {
    request = request.or(
      `kode_barang.ilike.%${needle}%,spesifikasi.ilike.%${needle}%,notes.ilike.%${needle}%`
    );
  }
  if (query.status === "active") request = request.eq("is_active", true);
  if (query.status === "inactive") request = request.eq("is_active", false);
  if (query.noImage) request = request.eq("image_urls", "{}");
  if (query.srpZero) request = request.eq("srp", 0);
  if (query.noName) request = request.or(`nama_produk.is.null,nama_produk.eq.""`);
  if (query.duplicates) request = request.eq("duplikat_warna", true);
  // Kode barang tidak lagi memuat segmen brand, jadi filter memakai kata
  // pertama spesifikasi (tempat nama brand berada).
  if (query.brand) {
    const brandName = BRAND_FROM_CODE_SEGMENT[query.brand.toUpperCase()] || query.brand;
    request = request.ilike("spesifikasi", `${sanitizeQuery(brandName)} %`);
  }

  // Filter kategori layar: dibaca dari tabel admin-only product_screen_info.
  // 'belum' = baris belum ada ATAU kategori 'belum' → komplemen dari 14/15/16.
  const screen = (query.screen || "").trim();
  if (screen === "14" || screen === "15" || screen === "16") {
    const { data, error } = await supabase
      .from("product_screen_info")
      .select("product_id")
      .eq("kategori", screen);
    if (error) throw new Error(error.message);
    const ids = (data || []).map((row) => row.product_id);
    if (ids.length === 0) return { rows: [], count: 0, page, totalPages: 1 };
    request = request.in("id", ids);
  } else if (screen === "belum") {
    const { data, error } = await supabase
      .from("product_screen_info")
      .select("product_id")
      .in("kategori", ["14", "15", "16"]);
    if (error) throw new Error(error.message);
    const excluded = (data || []).map((row) => row.product_id);
    if (excluded.length > 0) request = request.not("id", "in", `(${excluded.join(",")})`);
  }

  const { data, error, count } = await request
    .order(sortField, { ascending })
    .range((page - 1) * perPage, page * perPage - 1);

  if (error) throw new Error(error.message);

  const rows = normalizeRows(data);
  await attachScreenInfo(rows);

  const total = count ?? 0;
  return {
    rows,
    count: total,
    page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

// Lampirkan kategori layar (untuk tampilan admin) ke baris produk.
async function attachScreenInfo(rows: ProductRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { getScreenInfoMap } = await import("./product-screen");
  const map = await getScreenInfoMap(rows.map((row) => row.id));
  if (!map) return;
  for (const row of rows) {
    const info = map.get(row.id);
    row.screen = info
      ? { kategori: info.kategori, sumber: info.sumber }
      : { kategori: "belum", sumber: "auto" };
  }
}

export async function getProductById(id: string): Promise<ProductRow | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const [row] = normalizeRows([data]);
  await attachScreenInfo([row]);
  return row;
}

export async function createProduct(input: ProductInput): Promise<ProductRow> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      kode_barang: input.kode_barang,
      spesifikasi: input.spesifikasi,
      nama_produk: input.nama_produk || null,
      notes: input.notes || null,
      srp: input.srp,
      stok: input.stok ?? null,
      image_urls: input.image_urls,
      is_active: input.is_active,
      is_featured: input.is_featured,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const [row] = normalizeRows([data]);
  await safeAutoDetectScreen(row.id, row.spesifikasi);
  await safeAutoDetectColor(row.id, row.nama_produk, row.spesifikasi);
  await safeRegroup();
  const fresh = await getProductById(row.id);
  return fresh || row;
}

export async function updateProduct(id: string, input: ProductInput): Promise<ProductRow> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("products")
    .update({
      spesifikasi: input.spesifikasi,
      nama_produk: input.nama_produk || null,
      notes: input.notes || null,
      srp: input.srp,
      stok: input.stok ?? null,
      image_urls: input.image_urls,
      is_active: input.is_active,
      is_featured: input.is_featured,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const [row] = normalizeRows([data]);
  // Spesifikasi berubah → deteksi ulang, tetapi override manual tidak ditimpa.
  await safeAutoDetectScreen(row.id, row.spesifikasi);
  await safeAutoDetectColor(row.id, row.nama_produk, row.spesifikasi);
  await safeRegroup();
  const fresh = await getProductById(row.id);
  return fresh || row;
}

// Deteksi layar otomatis tidak boleh menggagalkan simpan produk; bila tabel
// belum dimigrasi, lewati diam-diam (admin tetap bisa set manual nanti).
async function safeAutoDetectScreen(productId: string, spesifikasi: string): Promise<void> {
  try {
    const { autoDetectScreenCategory } = await import("./product-screen");
    await autoDetectScreenCategory(productId, spesifikasi);
  } catch (error) {
    console.warn(
      `[screen] auto-detect dilewati untuk ${productId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Deteksi warna otomatis tidak boleh menggagalkan simpan produk; bila kolom
// varian belum dimigrasi, lewati diam-diam (admin tetap bisa set manual nanti).
async function safeAutoDetectColor(
  productId: string,
  namaProduk: string | null | undefined,
  spesifikasi: string
): Promise<void> {
  try {
    const { autoDetectColor } = await import("./product-color");
    await autoDetectColor(productId, namaProduk, spesifikasi);
  } catch (error) {
    console.warn(
      `[warna] auto-detect dilewati untuk ${productId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Hitung ulang grup varian setelah simpan. Best-effort: kegagalan (mis. migrasi
// belum jalan) tidak boleh membatalkan simpan produk.
async function safeRegroup(): Promise<void> {
  try {
    const { regroupProducts } = await import("./product-color");
    await regroupProducts(false);
  } catch (error) {
    console.warn(
      `[warna] regroup dilewati: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function setProductActive(id: string, isActive: boolean): Promise<ProductRow> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return normalizeRows([data])[0];
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setProductImages(id: string, imageUrls: string[]): Promise<ProductRow> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("products")
    .update({ image_urls: imageUrls })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return normalizeRows([data])[0];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = getSupabaseServiceClient();

  const [totalRes, activeRes, inactiveRes, noImageRes, srpZeroRes] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", false),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("image_urls", "{}"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("srp", 0),
  ]);

  const firstError = [totalRes, activeRes, inactiveRes, noImageRes, srpZeroRes].find(
    (result) => result.error
  );
  if (firstError?.error) throw new Error(firstError.error.message);

  return {
    total: totalRes.count ?? 0,
    active: activeRes.count ?? 0,
    inactive: inactiveRes.count ?? 0,
    noImage: noImageRes.count ?? 0,
    srpZero: srpZeroRes.count ?? 0,
  };
}

export async function getRecentImportLogs(limit = 10): Promise<ImportLogRow[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("import_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []) as ImportLogRow[];
}
