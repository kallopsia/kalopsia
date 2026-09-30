export type AddonKategori = "body" | "layar";
export type AddonTipe = "matte" | "glossy";

// Baris persis seperti yang disimpan di tabel Supabase `product_addons`.
export type ProductAddonRow = {
  id: string;
  kategori: AddonKategori;
  tipe: AddonTipe;
  harga: number;
  is_active: boolean;
  updated_at: string;
};
