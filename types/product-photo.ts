// Tipe baris tabel product_photos & product_photo_folders
// (migrasi 20261007000000_product_photos.sql).

export type PhotoSource = "sync" | "manual";
export type MappingSource = "xlsx" | "csv" | "manual";

// Hanya public_id yang disimpan, bukan URL panjang — URL dibangun saat render
// supaya transformasi (f_auto,q_auto) bisa berubah tanpa menulis ulang database.
export type ProductPhotoRow = {
  id?: string;
  product_id: string;
  public_id: string;
  posisi: number;
  folder?: string | null;
  sumber?: PhotoSource;
  synced_at?: string;
};

// Pemetaan SKU → folder Cloudinary (sumber kebenaran: sheet "Pemetaan SKU").
export type ProductPhotoFolderRow = {
  kode_barang: string;
  folder: string;
  sumber?: MappingSource;
  updated_at?: string;
};
