// Mencatat snapshot harga saat pembeli menekan tombol WhatsApp (checkout lewat
// WA, tidak ada keranjang/tabel pesanan formal). Dipanggil dari /api/wa.
// Kegagalan mencatat tidak boleh menggagalkan redirect WA.
import { getSupabaseServiceClient } from "./supabase/service";
import type { OrderIntentInsert, OrderIntentRow } from "@/types/order-intent";

export async function logOrderIntent(intent: OrderIntentInsert): Promise<void> {
  try {
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from("order_intents").insert({
      jenis: intent.jenis,
      product_id: intent.product_id ?? null,
      kode: intent.kode ?? null,
      nama: intent.nama ?? null,
      slug: intent.slug ?? null,
      screen_kategori: intent.screen_kategori ?? null,
      harga_produk: intent.harga_produk ?? null,
      addons: intent.addons ?? [],
      addon_total: intent.addon_total ?? 0,
      estimated_total: intent.estimated_total ?? null,
    });
    if (error) {
      console.warn(`[order-intent] gagal mencatat: ${error.message}`);
    }
  } catch (error) {
    console.warn(
      `[order-intent] dilewati: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function getRecentOrderIntents(limit = 50): Promise<OrderIntentRow[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("order_intents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data || []) as OrderIntentRow[]).map((row) => ({
    ...row,
    harga_produk: row.harga_produk === null ? null : Number(row.harga_produk),
    addon_total: Number(row.addon_total) || 0,
    estimated_total: row.estimated_total === null ? null : Number(row.estimated_total),
    addons: Array.isArray(row.addons) ? row.addons : [],
  }));
}
