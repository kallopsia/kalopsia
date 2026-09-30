import type { AddonKategori, AddonTipe } from "@/types/addon";

// Label tampilan add-on; dipakai UI (client) maupun pesan WhatsApp (server),
// jadi modul ini tidak boleh menarik dependensi server.
export const ADDON_CATEGORY_LABELS: Record<AddonKategori, string> = {
  body: "Anti Gores Body",
  layar: "Anti Gores Layar",
};

export const ADDON_TYPE_LABELS: Record<AddonTipe, string> = {
  matte: "Matte",
  glossy: "Glossy",
};

export function addonLabel(kategori: AddonKategori, tipe: AddonTipe): string {
  return `${ADDON_CATEGORY_LABELS[kategori]} (${ADDON_TYPE_LABELS[tipe]})`;
}
