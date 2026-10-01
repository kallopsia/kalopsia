// Konfigurasi sinkronisasi foto produk dari Cloudinary.
// Ubah berkas ini saja bila struktur folder di Cloudinary berubah.

// Semua folder foto produk berada di bawah prefix ini:
//   {CLOUDINARY_FOLDER_PREFIX}/{Nama Folder}/1.jpg
export const CLOUDINARY_FOLDER_PREFIX = "laptop";

// Brand yang sudah tidak dijual: pemetaannya tidak diimpor dan foldernya
// diabaikan saat sinkron (masuk daftar "folder brand dikecualikan", bukan
// sumber foto dan bukan folder yatim).
export type ExcludedBrand = {
  code: string;
  name: string;
};

export const EXCLUDED_BRANDS: ExcludedBrand[] = [
  { code: "GI", name: "GIGABYTE" },
  { code: "SP", name: "SPC" },
  { code: "TE", name: "TECNO" },
  { code: "ZY", name: "ZYREX" },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const EXCLUDED_CODE_SET = new Set(
  EXCLUDED_BRANDS.map((brand) => brand.code.toUpperCase())
);

const EXCLUDED_NAME_RES = EXCLUDED_BRANDS.map((brand) => ({
  name: brand.name,
  re: new RegExp(`\\b${escapeRegExp(brand.name.toUpperCase())}\\b`),
}));

// Segmen brand pada kode ber-prefix lama (…PR-LAP-<SEG>-…), atau null.
// Tidak harus di awal: nama folder bisa berupa "laptop/PR-LAP-GI-AERO".
export function brandCodeFromKode(kodeBarang: string): string | null {
  const match = /PR-LAP-([A-Z]{2})-/i.exec((kodeBarang || "").trim());
  return match ? match[1].toUpperCase() : null;
}

// Kode lama yang masih ber-prefix dikenali dari segmennya; kode/konfigurasi
// tanpa prefix dikenali dari kata brand utuh (mis. "GIGABYTE G5 MFIP").
export function isExcludedBrandText(text: string): boolean {
  const upper = (text || "").toUpperCase().replace(/\s+/g, " ").trim();
  if (!upper) return false;
  const code = brandCodeFromKode(upper);
  if (code && EXCLUDED_CODE_SET.has(code)) return true;
  return EXCLUDED_NAME_RES.some((entry) => entry.re.test(upper));
}

export function isExcludedKodeBarang(kodeBarang: string): boolean {
  return isExcludedBrandText(kodeBarang);
}

// Nama folder biasanya meniru KODEBARANG utuh (masih ber-prefix), jadi
// pengecekan yang sama dipakai untuk folder.
export function isExcludedFolder(folderName: string): boolean {
  return isExcludedBrandText(folderName);
}

export function excludedBrandSummary(): string {
  return EXCLUDED_BRANDS.map((brand) => `${brand.name} (${brand.code})`).join(", ");
}
