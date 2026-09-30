export type AddonKategori = "body" | "layar";
export type AddonTipe = "matte" | "glossy";

// Baris persis seperti yang disimpan di tabel Supabase `product_addons`.
export type ProductAddonRow = {
  id: string;
  kategori: AddonKategori;
  tipe: AddonTipe;
  // Harga default (fallback) — rupiah penuh.
  harga: number;
  // Harga per ukuran layar (migrasi 20261005000000); 0 = belum ditetapkan.
  harga_14: number;
  harga_15: number;
  harga_16: number;
  is_active: boolean;
  updated_at: string;
};

// Add-on dengan harga yang sudah diselesaikan untuk ukuran layar produk tertentu.
// Inilah yang dikirim ke komponen client & pesan WhatsApp — konsumen hanya
// melihat angka harga, tidak pernah label kategori layarnya.
export type ResolvedAddon = {
  id: string;
  kategori: AddonKategori;
  tipe: AddonTipe;
  harga: number;
  // true bila harga ukuran belum ada sehingga jatuh ke harga default.
  fallback: boolean;
};
