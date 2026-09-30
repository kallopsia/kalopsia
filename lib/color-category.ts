// Deteksi warna dari teks spesifikasi/nama + kunci pengelompokan varian.
// Modul murni — aman diimpor client maupun server, tanpa dependensi Supabase.
import { COLOR_CODES, canonicalColor } from "./color-config";

export type DetectedColor = {
  // Kode asli persis seperti di konfigurasi (untuk tampilan), mis. "SPACE BLK".
  code: string;
  // Bentuk kanonik untuk pengelompokan/dedup, mis. "GRY"/"GRAY"/"GREY" → "GREY".
  canonical: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Urutkan kode terpanjang lebih dulu agar "SPACE BLK" menang atas "BLK",
// "ROYAL BLU" atas "BLU", "DARK GRY" atas "GRY", dst. Seri panjang sama
// diurutkan alfabetis supaya deterministik.
const SORTED_CODES: string[] = COLOR_CODES.slice().sort((a, b) => {
  if (b.length !== a.length) return b.length - a.length;
  return a.localeCompare(b);
});

const CODE_REGEXES: { code: string; re: RegExp }[] = SORTED_CODES.map((code) => ({
  code,
  re: new RegExp(`\\b${escapeRegExp(code.toUpperCase())}\\b`),
}));

// Cari kode warna pada teks: case-insensitive, word boundary, longest-match-first.
// Tidak ada kecocokan di dalam kata (mis. "SAND" tidak match pada "SANDISK").
export function detectColor(text: string | null | undefined): DetectedColor | null {
  const normalized = (text || "").toUpperCase().replace(/\s+/g, " ");
  if (!normalized.trim()) return null;
  for (const { code, re } of CODE_REGEXES) {
    if (re.test(normalized)) {
      return { code, canonical: canonicalColor(code) };
    }
  }
  return null;
}

// Buang sufiks kode varian di ujung (mis. " -MGPN3ID/A") supaya SKU berbeda
// tidak menghalangi pengelompokan, lalu buang kode warna, rapikan spasi, lowercase.
export function specSansColor(
  spec: string | null | undefined,
  color: DetectedColor | null
): string {
  let text = (spec || "").trim();
  text = text.replace(/\s*-[A-Z0-9./-]+$/i, " ");
  if (color) {
    const re = new RegExp(`\\b${escapeRegExp(color.code.toUpperCase())}\\b`, "gi");
    text = text.replace(re, " ");
  }
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeKey(value: string | null | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

// Buang semua kemunculan kode warna dari sebuah teks (dipakai untuk nama yang
// mungkin memuat warna, mis. nama turunan spesifikasi "… SPACE BLK").
function stripColor(value: string, color: DetectedColor | null): string {
  if (!color) return value;
  const re = new RegExp(`\\b${escapeRegExp(color.code.toUpperCase())}\\b`, "gi");
  return value.replace(re, " ").replace(/\s+/g, " ").trim();
}

// Kunci pengelompokan varian: nama + spesifikasi-tanpa-warna + kategori layar.
// Nama ikut dibersihkan dari kode warna supaya dua varian (mis. "… SPACE BLK"
// dan "… STARLIGHT") yang hanya beda warna menghasilkan kunci yang sama.
export function variantGroupingKey(input: {
  name: string | null | undefined;
  spec: string | null | undefined;
  color: DetectedColor | null;
  screenCategory: string;
}): string {
  const nameKey = normalizeKey(stripColor(input.name || "", input.color));
  const specKey = specSansColor(input.spec, input.color);
  return [nameKey, specKey, normalizeKey(input.screenCategory)].join("||");
}
