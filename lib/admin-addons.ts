import { getSupabaseServiceClient } from "./supabase/service";
import type { AddonUpdate } from "./service-schema";

// Kombinasinya tetap empat baris (seed migrasi), jadi admin hanya memperbarui
// harga & status aktif; tidak ada insert/delete lewat aplikasi.
export async function saveAddons(updates: AddonUpdate[]): Promise<void> {
  const supabase = getSupabaseServiceClient();
  for (const update of updates) {
    const { error } = await supabase
      .from("product_addons")
      .update({ harga: update.harga, is_active: update.is_active })
      .eq("id", update.id);
    if (error) throw new Error(error.message);
  }
}
