// Sisi server: simpan & baca pemetaan SKU → folder foto Cloudinary.
// Hanya dipakai kode server (service role) — tidak pernah di-bundle ke client.

import { getSupabaseServiceClient } from "./supabase/service";
import {
  joinMappingToProducts,
  normalizeMappingRows,
  type MappingProduct,
  type PhotoMappingInput,
  type PhotoMappingRow,
} from "./photo-mapping";
import { parsePhotoMappingFile, type ParsedPhotoMapping } from "./photo-mapping-parser";
import { isExcludedKodeBarang } from "./photo-config";
import type { MappingSource, ProductPhotoFolderRow } from "@/types/product-photo";

export const PHOTO_MAPPING_MAX_BYTES = 10 * 1024 * 1024;

export type MappingImportReport = {
  filename: string;
  sheetName: string;
  totalRows: number;
  saved: number;
  folderCount: number;
  matchedProducts: number;
  unknownSkus: PhotoMappingRow[];
  issues: { rowNumber: number | null; message: string }[];
  excludedCount: number;
  duplicateCount: number;
  warnings: string[];
};

export type MappingPreview = {
  report: MappingImportReport;
  rows: PhotoMappingRow[];
};

async function dbProducts(): Promise<MappingProduct[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("products").select("id,kode_barang");
  if (error) throw new Error(`Gagal membaca produk: ${error.message}`);
  return (data || []) as MappingProduct[];
}

// Baca berkas (xlsx sheet "Pemetaan SKU" atau CSV kodebarang,url_foto) dan
// laporkan isinya TANPA menulis apa pun.
export async function previewPhotoMapping(
  data: ArrayBuffer | Uint8Array,
  filename: string
): Promise<MappingPreview> {
  const parsed: ParsedPhotoMapping = parsePhotoMappingFile(data, filename);
  const normalized = normalizeMappingRows(parsed.inputs);
  const products = await dbProducts();
  const joined = joinMappingToProducts(normalized.rows, products);

  return {
    rows: normalized.rows,
    report: {
      filename,
      sheetName: parsed.sheetName,
      totalRows: parsed.inputs.length,
      saved: normalized.rows.length,
      folderCount: joined.folderKeys.length,
      matchedProducts: joined.targets.length,
      unknownSkus: joined.unknownSkus,
      issues: normalized.issues,
      excludedCount: normalized.excludedCount,
      duplicateCount: normalized.duplicateCount,
      warnings: parsed.warnings,
    },
  };
}

// Upsert berdasarkan KODEBARANG. SKU yang belum ada di DB tetap disimpan
// (nantinya terpakai saat produk impor), dan dilaporkan lewat preview.
export async function savePhotoMapping(
  rows: PhotoMappingRow[],
  source: MappingSource = "xlsx"
): Promise<number> {
  if (rows.length === 0) return 0;
  const supabase = getSupabaseServiceClient();
  const batch = 500;
  let saved = 0;

  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch).map((row) => ({
      kode_barang: row.kode_barang,
      folder: row.folder,
      sumber: source,
    }));
    const { error } = await supabase
      .from("product_photo_folders")
      .upsert(chunk, { onConflict: "kode_barang" });
    if (error) throw new Error(`Gagal menyimpan pemetaan: ${error.message}`);
    saved += chunk.length;
  }

  return saved;
}

export async function importPhotoMappingFile(
  data: ArrayBuffer | Uint8Array,
  filename: string
): Promise<{ report: MappingImportReport; saved: number }> {
  const preview = await previewPhotoMapping(data, filename);
  const source: MappingSource = filename.toLowerCase().endsWith(".csv") ? "csv" : "xlsx";
  const saved = await savePhotoMapping(preview.rows, source);
  return { report: preview.report, saved };
}

export async function listPhotoMapping(): Promise<ProductPhotoFolderRow[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("product_photo_folders")
    .select("kode_barang,folder,sumber,updated_at")
    .order("kode_barang", { ascending: true });
  if (error) {
    throw new Error(
      `Gagal membaca product_photo_folders: ${error.message}. ` +
        `Pastikan migrasi 20261007000000_product_photos.sql sudah dijalankan.`
    );
  }
  return (data || []) as ProductPhotoFolderRow[];
}

// Ringkasan + isi tabel pemetaan untuk halaman admin.
export type PhotoMappingAdminPayload = {
  rows: ProductPhotoFolderRow[];
  stored: number;
  folders: number;
  manual: number;
  excluded: number;
};

export async function photoMappingRowsForAdmin(): Promise<PhotoMappingAdminPayload> {
  const rows = await listPhotoMapping();
  const folderKeys = new Set<string>();
  let manual = 0;
  let excluded = 0;
  rows.forEach((row) => {
    folderKeys.add(row.folder.trim().toLowerCase());
    if (row.sumber === "manual") manual += 1;
    if (isExcludedKodeBarang(row.kode_barang)) excluded += 1;
  });
  return { rows, stored: rows.length, folders: folderKeys.size, manual, excluded };
}

// Override folder per SKU (FITUR 5) — ubah satu baris pemetaan.
export async function setSkuFolder(
  kode_barang: string,
  folder: string | null
): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const code = kode_barang.trim();
  if (!code) throw new Error("Kode barang wajib diisi.");

  if (folder === null) {
    const { error } = await supabase.from("product_photo_folders").delete().eq("kode_barang", code);
    if (error) throw new Error(`Gagal menghapus pemetaan: ${error.message}`);
    return;
  }

  const clean = folder.trim().replace(/\s+/g, " ");
  if (!clean) throw new Error("Nama folder tidak boleh kosong.");
  if (isExcludedKodeBarang(code)) {
    throw new Error(`${code} termasuk brand yang sudah tidak dijual.`);
  }

  const { error } = await supabase
    .from("product_photo_folders")
    .upsert({ kode_barang: code, folder: clean, sumber: "manual" }, { onConflict: "kode_barang" });
  if (error) throw new Error(`Gagal menyimpan folder: ${error.message}`);
}

// Pemetaan siap pakai untuk engine sinkron (sudah dibersihkan & brand
// nonaktif dibuang ulang, untuk berjaga-berjaga terhadap data lama).
export async function readPhotoMappingRows(): Promise<PhotoMappingRow[]> {
  const stored = await listPhotoMapping();
  const inputs: PhotoMappingInput[] = stored.map((row) => ({
    kode_barang: row.kode_barang,
    folder: row.folder,
  }));
  return normalizeMappingRows(inputs).rows;
}
