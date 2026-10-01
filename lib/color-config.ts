// Satu-satunya sumber daftar kode warna + peta normalisasi alias.
// Diedit di sini saja; deteksi (lib/color-category.ts) membaca dari file ini.

// 42 kode warna yang dikenali. Ditulis apa adanya (huruf besar), termasuk
// kode multi-kata yang harus tetap berbeda (DARK GRY vs GRY, dll).
export const COLOR_CODES: string[] = [
  "BLK",
  "LILAC",
  "GRY",
  "MATCHA",
  "SLV",
  "BLU",
  "PNK",
  "ROSE",
  "BLUE",
  "PINK",
  "SILVER",
  "DARK GRY",
  "WHT",
  "GLD",
  "SKY BLUE",
  "STARLIGHT",
  "CITRUS",
  "INDIGO",
  "SPACE BLK",
  "TERRACOTA",
  "COOL SLV",
  "TERRA COTA",
  "TERRACOTTA",
  "TERRA COTTA",
  "BRW",
  "BEIGE",
  "TITANIUM BRW",
  "PURPLE",
  "BRN",
  "GRAY",
  "EVO BLU",
  "EVO GREY",
  "VOLCANO GREY",
  "CORAL TIDES",
  "GREY",
  "WHITE",
  "LUNA GRY",
  "SEASHELL",
  "TEAL",
  "SAND",
  "ROYAL BLU",
  "URBAN GRY",
  "ROSE GOLD",
  "LIGHT GRY",
];

// Normalisasi alias: beberapa ejaan menunjuk warna kanonik yang sama.
// Kode multi-kata bermakna khusus (DARK GRY, SPACE BLK, ROSE GOLD, dll)
// TIDAK ada di peta ini sehingga kanoniknya = dirinya sendiri (tetap berbeda).
export const COLOR_ALIAS: Record<string, string> = {
  BLK: "BLACK",
  GRY: "GREY",
  GRAY: "GREY",
  GREY: "GREY",
  SLV: "SILVER",
  SILVER: "SILVER",
  BLU: "BLUE",
  BLUE: "BLUE",
  PNK: "PINK",
  PINK: "PINK",
  WHT: "WHITE",
  WHITE: "WHITE",
  BRW: "BROWN",
  BRN: "BROWN",
  GLD: "GOLD",
  TERRACOTA: "TERRACOTA",
  "TERRA COTA": "TERRACOTA",
  TERRACOTTA: "TERRACOTA",
  "TERRA COTTA": "TERRACOTA",
};

// Kanonik untuk pengelompokan/dedup. Kode di luar peta alias → dirinya sendiri.
export function canonicalColor(code: string): string {
  const key = (code || "").toUpperCase().replace(/\s+/g, " ").trim();
  return COLOR_ALIAS[key] || key;
}
