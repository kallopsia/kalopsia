// Baris tabel jasa & sparepart (Supabase). Harga dalam rupiah penuh.
export type WindowsInstallRow = {
  id: string;
  harga: number;
  deskripsi: string | null;
  updated_at: string;
};

export type SoftwareRow = {
  id: string;
  nama: string;
  slug: string;
  image_url: string | null;
  harga: number;
  spesifikasi_minimum: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SparepartRow = {
  id: string;
  nama: string;
  slug: string;
  image_url: string | null;
  harga: number;
  deskripsi: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
