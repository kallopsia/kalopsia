// Baris persis seperti yang disimpan di tabel Supabase `products`.
export type ProductRow = {
  id: string;
  kode_barang: string;
  spesifikasi: string;
  notes: string | null;
  srp: number;
  image_urls: string[];
  is_active: boolean;
  // Opsional: kolom baru (migrasi 20260930000000); baris lama tanpa kolom ini tetap valid.
  is_featured?: boolean;
  // Opsional: kolom baru (migrasi 20261003000000); kosong = judul fallback ke spesifikasi.
  nama_produk?: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductInsert = Pick<
  ProductRow,
  "kode_barang" | "spesifikasi" | "notes" | "srp" | "image_urls" | "is_active"
>;

export type SpecRingkas = {
  prosesor?: string;
  memori?: string;
  penyimpanan?: string;
  grafis?: string;
  layar?: string;
  sistemOperasi?: string;
};

// Model tampilan untuk storefront. Diturunkan dari ProductRow saat query,
// brand/kategori/slug tidak disimpan di database.
export type Product = {
  id: string;
  slug: string;
  kodeBarang: string;
  nama: string;
  brand: string;
  kategori: string[];
  srp: number;
  harga: number;
  hargaTersedia: boolean;
  catatan: string;
  spesifikasiText: string;
  spesifikasi: SpecRingkas;
  gambar: string[];
  isActive: boolean;
  updatedAt: string;
};
