import type { Product, ProductRow, SpecRingkas } from "@/types/product";
import { productPlaceholder } from "./placeholder";
import { hasPrice, srpToRupiah } from "./pricing";

// Brand diturunkan dari segmen ke-3 KODEBARANG (PR-LAP-<SEG>-...).
export const BRAND_FROM_CODE_SEGMENT: Record<string, string> = {
  AC: "Acer",
  AD: "Advan",
  AP: "Apple",
  AS: "ASUS",
  AX: "Axioo",
  DE: "Dell",
  GI: "Gigabyte",
  HP: "HP",
  IN: "Infinix",
  LE: "Lenovo",
  MS: "MSI",
  SP: "SPC",
  TE: "Tecno",
  ZY: "Zyrex",
};

const GAMING_RE =
  /\b(ROG|TUF|NITRO|PREDATOR|LEGION|LOQ|VICTUS|OMEN|RAZER|GAMING|RTX|GTX|ZEPHYRUS|STRIX|SCAR|KATANA|SWORD|STEALTH|CROSSHAIR|RAIDER|VECTOR|PULSE|MSI)\b/i;
const ULTRABOOK_RE =
  /\b(ZENBOOK|VIVOBOOK|SWIFT|YOGA|THINKBOOK|ASPIRE\s+GO|MACBOOK\s+AIR|XPS|ENVY|SPECTRE|ULTRABOOK|SLIM|THIN|LGFIT|EXPERTBOOK\s+B)\b/i;
const PRODUKTIVITAS_RE =
  /\b(TRAVELMATE|THINKPAD|LATITUDE|PROBOOK|ELITEBOOK|EXPERTBOOK|IDEAPAD|VIVOBOOK|ASPIRE|INSPIRON|MACBOOK\s+PRO|OHS|OFFICE)\b/i;

const PROC_RE =
  /\b(APPLE\s+M[1-4](?:\s+(?:PRO|MAX))?|RYZEN\s+(?:AI\s+)?(?:PRO\s+)?[3579](?:\s+[A-Z0-9]{2,8})?|CORE\s+(?:ULTRA\s+)?[I3579]\d?(?:[-\s]+\d{3,5}[A-Z]{0,3})?|CELERON\s+[A-Z]?\d{3,5}|PENTIUM(?:\s+[A-Z]{1,3}\d{2,4})?)\b/i;
const GPU_RE =
  /\b(RTX\s?A?\d{3,4}|GTX\s?\d{3,4}|INTEL\s+(?:IRIS|ARC)[A-Z\s]{0,8}|RADEON\s+[A-Z0-9\s]{0,10})\b/i;
const OS_RE = /\b(W11|WINDOWS\s*11|W10|WINDOWS\s*10|MACOS|CHROME\s*OS)\b/i;
const PANEL_RE =
  /\b(FHD|WUXGA|WQXGA|WXGA|QHD|UHD|2\.5K|3K|4K|OLED|IPS|VA|TN|144HZ|120HZ|165HZ|180HZ|240HZ|TOUCH|2IN1|ANTIGLARE)\b/gi;
const MEMORY_RE = /\b(\d{1,3}(?:\.\d+)?)\s?(GB|TB)\b/gi;

export function productSlug(kodeBarang: string): string {
  return kodeBarang
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function brandFromKode(kodeBarang: string, spesifikasi: string): string {
  const segment = (kodeBarang.split("-")[2] || "").trim().toUpperCase();
  const mapped = BRAND_FROM_CODE_SEGMENT[segment];
  if (mapped) return mapped;
  const firstWord = spesifikasi.trim().split(/\s+/)[0];
  return firstWord ? firstWord.charAt(0) + firstWord.slice(1).toLowerCase() : "Lainnya";
}

export function deriveKategori(spesifikasi: string, brand: string): string[] {
  const text = `${brand} ${spesifikasi}`;
  const kategori: string[] = [];
  if (GAMING_RE.test(text)) kategori.push("gaming");
  if (ULTRABOOK_RE.test(text)) kategori.push("ultrabook");
  if (PRODUKTIVITAS_RE.test(text)) kategori.push("produktivitas");
  if (kategori.length === 0) kategori.push("laptop");
  return kategori;
}

// Nama tampilan: spesifikasi tanpa sufiks kode varian di ujung (mis. " -59G.516S").
export function productName(spesifikasi: string): string {
  const cleaned = spesifikasi.replace(/\s*-[A-Z0-9./-]+$/, "").trim();
  return cleaned || spesifikasi.trim();
}

export function extractSpec(spesifikasi: string): SpecRingkas {
  const text = spesifikasi;
  const sizes = text.match(MEMORY_RE) || [];
  const memori = sizes[0];
  const penyimpanan = sizes[1];
  const panel = Array.from(new Set((text.match(PANEL_RE) || []).map((p) => p.toUpperCase())));
  const sizeMatch = text.match(/\b(1[0-9]|2[0-9])\.\d\b/);
  const layar = [sizeMatch ? `${sizeMatch[0]}"` : "", panel.slice(0, 4).join(" ")]
    .filter(Boolean)
    .join(" ");
  const os = text.match(OS_RE);

  const spec: SpecRingkas = {};
  const proc = text.match(PROC_RE);
  if (proc) spec.prosesor = normalizeSpace(proc[0]);
  if (memori) spec.memori = `RAM ${normalizeSpace(memori)}`;
  if (penyimpanan) spec.penyimpanan = normalizeSpace(penyimpanan);
  const gpu = text.match(GPU_RE);
  if (gpu) spec.grafis = normalizeSpace(gpu[0]);
  if (layar) spec.layar = layar;
  if (os) spec.sistemOperasi = osLabel(os[0]);
  return spec;
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function osLabel(value: string): string {
  const v = value.toUpperCase().replace(/\s+/g, "");
  if (v === "W11" || v === "WINDOWS11") return "Windows 11";
  if (v === "W10" || v === "WINDOWS10") return "Windows 10";
  if (v === "MACOS") return "macOS";
  return "Chrome OS";
}

export function toProduct(row: ProductRow): Product {
  const spesifikasiText = normalizeSpace(row.spesifikasi || "");
  const brand = brandFromKode(row.kode_barang, spesifikasiText);
  const images = (row.image_urls || []).filter(Boolean);
  const nama = productName(spesifikasiText);

  return {
    id: row.id,
    slug: productSlug(row.kode_barang),
    kodeBarang: row.kode_barang,
    nama,
    brand,
    kategori: deriveKategori(spesifikasiText, brand),
    srp: Number(row.srp) || 0,
    harga: srpToRupiah(Number(row.srp) || 0),
    hargaTersedia: hasPrice(Number(row.srp) || 0),
    catatan: row.notes ? normalizeSpace(row.notes) : "",
    spesifikasiText,
    spesifikasi: extractSpec(spesifikasiText),
    m1VsLama: row.m1_vs_lama ? normalizeSpace(row.m1_vs_lama) : "",
    gambar: images.length > 0 ? images : [productPlaceholder(nama)],
    isActive: row.is_active,
    updatedAt: row.updated_at,
  };
}

export function collectKategori(products: Product[]): string[] {
  const set = new Set<string>();
  products.forEach((product) => product.kategori.forEach((k) => set.add(k)));
  return Array.from(set).sort();
}
