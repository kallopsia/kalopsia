import type { AddonKategori, AddonTipe } from "./addon";

export type OrderIntentJenis = "produk" | "software" | "sparepart" | "pesan";

export type OrderIntentAddon = {
  kategori: AddonKategori;
  tipe: AddonTipe;
  label: string;
  harga: number;
};

// Baris tabel `order_intents` (snapshot harga saat pembeli menekan tombol WA).
export type OrderIntentRow = {
  id: string;
  created_at: string;
  jenis: OrderIntentJenis;
  product_id: string | null;
  kode: string | null;
  nama: string | null;
  slug: string | null;
  screen_kategori: string | null;
  harga_produk: number | null;
  addons: OrderIntentAddon[];
  addon_total: number;
  estimated_total: number | null;
};

export type OrderIntentInsert = {
  jenis: OrderIntentJenis;
  product_id?: string | null;
  kode?: string | null;
  nama?: string | null;
  slug?: string | null;
  screen_kategori?: string | null;
  harga_produk?: number | null;
  addons?: OrderIntentAddon[];
  addon_total?: number;
  estimated_total?: number | null;
};
