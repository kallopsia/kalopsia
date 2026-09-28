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
  brand?: string;
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
  if (query.brand) request = request.like("kode_barang", `PR-LAP-${sanitizeQuery(query.brand)}-%`);

  const { data, error, count } = await request
    .order(sortField, { ascending })
    .range((page - 1) * perPage, page * perPage - 1);

  if (error) throw new Error(error.message);

  const total = count ?? 0;
  return {
    rows: normalizeRows(data),
    count: total,
    page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getProductById(id: string): Promise<ProductRow | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalizeRows([data])[0] : null;
}

export async function createProduct(input: ProductInput): Promise<ProductRow> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      kode_barang: input.kode_barang,
      spesifikasi: input.spesifikasi,
      notes: input.notes || null,
      srp: input.srp,
      image_urls: input.image_urls,
      is_active: input.is_active,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return normalizeRows([data])[0];
}

export async function updateProduct(id: string, input: ProductInput): Promise<ProductRow> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("products")
    .update({
      spesifikasi: input.spesifikasi,
      notes: input.notes || null,
      srp: input.srp,
      image_urls: input.image_urls,
      is_active: input.is_active,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return normalizeRows([data])[0];
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

export async function bulkSetImages(
  entries: { kode_barang: string; image_url: string }[]
): Promise<{ updated: number; missing: string[] }> {
  const supabase = getSupabaseServiceClient();
  const kodes = Array.from(new Set(entries.map((entry) => entry.kode_barang)));
  const { data: existing, error } = await supabase
    .from("products")
    .select("id,kode_barang,image_urls")
    .in("kode_barang", kodes);
  if (error) throw new Error(error.message);

  const rowsByKode = new Map<string, { id: string; image_urls: string[] }>();
  ((existing || []) as { id: string; kode_barang: string; image_urls: string[] }[]).forEach((row) =>
    rowsByKode.set(row.kode_barang, { id: row.id, image_urls: row.image_urls || [] })
  );

  const missing = kodes.filter((kode) => !rowsByKode.has(kode));
  let updated = 0;

  for (const entry of entries) {
    const row = rowsByKode.get(entry.kode_barang);
    if (!row) continue;
    if (row.image_urls.includes(entry.image_url)) continue;
    const nextUrls = [...row.image_urls, entry.image_url];
    const { error: updateError } = await supabase
      .from("products")
      .update({ image_urls: nextUrls })
      .eq("id", row.id);
    if (updateError) throw new Error(updateError.message);
    row.image_urls = nextUrls;
    updated += 1;
  }

  return { updated, missing };
}
