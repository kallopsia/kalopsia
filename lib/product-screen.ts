// Akses server-only ke tabel `product_screen_info` (kategori layar admin-only).
// Tabel punya RLS admin-only total, jadi hanya service role / sesi admin yang
// bisa membaca — field ini tidak pernah bocor lewat API publik Supabase.
import { getSupabaseServiceClient } from "./supabase/service";
import { detectScreenCategory, type ScreenCategory } from "./screen-category";
import type { ProductScreenInfoRow, ScreenSource } from "@/types/screen";

export type { ProductScreenInfoRow };

export function normalizeScreenRows(rows: unknown): ProductScreenInfoRow[] {
  return (rows || []) as ProductScreenInfoRow[];
}

function toRow(
  productId: string,
  kategori: ScreenCategory,
  sumber: ScreenSource
): { product_id: string; kategori: ScreenCategory; sumber: ScreenSource } {
  return { product_id: productId, kategori, sumber };
}

// Baca toleran: migrasi belum dijalankan → null (fitur layar disembunyikan).
export async function getScreenInfoMap(
  productIds: string[]
): Promise<Map<string, ProductScreenInfoRow> | null> {
  if (productIds.length === 0) return new Map();
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("product_screen_info")
    .select("*")
    .in("product_id", productIds);
  if (error) {
    console.warn(`[screen] gagal membaca product_screen_info: ${error.message}`);
    return null;
  }
  return new Map(normalizeScreenRows(data).map((row) => [row.product_id, row]));
}

export async function getScreenInfo(
  productId: string
): Promise<{ kategori: ScreenCategory; sumber: ScreenSource } | null> {
  const map = await getScreenInfoMap([productId]);
  if (!map) return null;
  const row = map.get(productId);
  return row ? { kategori: row.kategori, sumber: row.sumber } : { kategori: "belum", sumber: "auto" };
}

export async function setScreenCategory(
  productId: string,
  kategori: ScreenCategory,
  sumber: ScreenSource
): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("product_screen_info")
    .upsert(toRow(productId, kategori, sumber), { onConflict: "product_id" });
  if (error) throw new Error(error.message);
}

// Deteksi ulang dari spesifikasi; override manual admin tidak pernah ditimpa.
export async function autoDetectScreenCategory(
  productId: string,
  spesifikasi: string
): Promise<ScreenCategory> {
  const current = await getScreenInfo(productId);
  if (current?.sumber === "manual") return current.kategori;

  const supabase = getSupabaseServiceClient();
  const kategori = detectScreenCategory(spesifikasi);
  const { error } = await supabase
    .from("product_screen_info")
    .upsert(toRow(productId, kategori, "auto"), { onConflict: "product_id" });
  if (error) {
    // Melempar agar pemanggil (admin/script) tahu bila tabel belum dimigrasi.
    throw new Error(error.message);
  }
  return kategori;
}

// Reset massal ke hasil deteksi otomatis. onlyUncategorized membatasi pada
// produk yang belum terdeteksi (kategori 'belum' atau belum punya baris).
export async function recategorizeAllScreens(onlyUncategorized: boolean): Promise<{
  processed: number;
  changed: number;
  skippedManual: number;
  uncategorized: number;
}> {
  const supabase = getSupabaseServiceClient();
  const { data: products, error } = await supabase.from("products").select("id, spesifikasi");
  if (error) throw new Error(error.message);

  const { data: existing, error: screenError } = await supabase
    .from("product_screen_info")
    .select("*");
  if (screenError) throw new Error(screenError.message);

  const existingMap = new Map(
    normalizeScreenRows(existing).map((row) => [row.product_id, row])
  );

  const rows: { product_id: string; kategori: ScreenCategory; sumber: ScreenSource }[] = [];
  let skippedManual = 0;
  let uncategorized = 0;

  for (const product of (products || []) as { id: string; spesifikasi: string }[]) {
    const current = existingMap.get(product.id);
    if (current?.sumber === "manual") {
      skippedManual += 1;
      if (current.kategori === "belum") uncategorized += 1;
      continue;
    }
    const kategori = detectScreenCategory(product.spesifikasi);
    if (kategori === "belum") uncategorized += 1;
    if (onlyUncategorized && current && current.kategori !== "belum") continue;
    if (current && current.kategori === kategori && current.sumber === "auto") continue;
    rows.push(toRow(product.id, kategori, "auto"));
  }

  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error: upsertError } = await supabase
      .from("product_screen_info")
      .upsert(rows.slice(i, i + BATCH), { onConflict: "product_id" });
    if (upsertError) throw new Error(upsertError.message);
  }

  return {
    processed: (products || []).length,
    changed: rows.length,
    skippedManual,
    uncategorized,
  };
}
