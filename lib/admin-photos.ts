// Sisi server untuk sinkronisasi foto: baca pemetaan + produk, tanya Cloudinary
// Admin API (hanya di sini, tidak pernah dari frontend), lalu tulis hasilnya.

import { getSupabaseServiceClient } from "./supabase/service";
import { listPhotoMapping, readPhotoMappingRows } from "./admin-photo-mapping";
import { joinMappingToProducts, type PhotoMappingRow } from "./photo-mapping";
import { CLOUDINARY_FOLDER_PREFIX, isExcludedKodeBarang } from "./photo-config";
import {
  computePhotoSyncPlan,
  type ExistingPhoto,
  type PhotoSyncReport,
  type SyncTarget,
} from "./photo-sync";
import { listChildFolders, listImageAssets, type CloudinaryAsset } from "./cloudinary-admin";

export type { PhotoSyncReport };

const DELETE_BATCH = 100;
const INSERT_BATCH = 500;

type ProductPhotoSourceRow = {
  id: string;
  kode_barang: string;
  image_urls: string[] | null;
};

export type PhotoMappingSummary = {
  stored: number;
  folders: number;
  excluded: number;
};

export async function photoMappingSummary(): Promise<PhotoMappingSummary> {
  const rows = await listPhotoMapping();
  const folders = new Set(rows.map((row) => row.folder.trim().toLowerCase()));
  const excluded = rows.filter((row) => isExcludedKodeBarang(row.kode_barang)).length;
  return { stored: rows.length, folders: folders.size, excluded };
}

async function loadTargets(rows: PhotoMappingRow[]): Promise<SyncTarget[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,kode_barang,image_urls");
  if (error) throw new Error(`Gagal membaca produk: ${error.message}`);

  const products = (data || []) as ProductPhotoSourceRow[];
  const manualCountById: Record<string, number> = {};
  products.forEach((product) => {
    manualCountById[product.id] = (product.image_urls || []).filter(Boolean).length;
  });

  const joined = joinMappingToProducts(
    rows,
    products.map((product) => ({ id: product.id, kode_barang: product.kode_barang }))
  );

  return joined.targets.map((target) => ({
    ...target,
    manualPhotoCount: manualCountById[target.productId] || 0,
  }));
}

async function loadExistingPhotos(): Promise<ExistingPhoto[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("product_photos")
    .select("product_id,public_id,posisi,sumber");
  if (error) {
    throw new Error(
      `Gagal membaca product_photos: ${error.message}. ` +
        `Pastikan migrasi 20261007000000_product_photos.sql sudah dijalankan.`
    );
  }
  return ((data || []) as { product_id: string; public_id: string; posisi: number; sumber: string }[]).map(
    (row) => ({
      product_id: row.product_id,
      public_id: row.public_id,
      posisi: row.posisi,
      sumber: row.sumber === "manual" ? "manual" : "sync",
    })
  );
}

export type PhotoSyncSource = {
  assets: CloudinaryAsset[];
  folders: string[];
  folderFetchFailed: string | null;
};

// Satu kali listing berpaginasi untuk seluruh folder di bawah prefix.
export async function fetchCloudinarySource(prefix = CLOUDINARY_FOLDER_PREFIX): Promise<PhotoSyncSource> {
  const assets = await listImageAssets(prefix);
  let folders: string[] = [];
  let folderFetchFailed: string | null = null;
  try {
    folders = await listChildFolders(prefix);
  } catch (error) {
    // Daftar folder hanya memperkaya laporan folder yatim.
    folderFetchFailed = error instanceof Error ? error.message : String(error);
  }
  return { assets, folders, folderFetchFailed };
}

export type DryRunOptions = {
  overwrite?: boolean;
  prefix?: string;
  // Disuntik untuk pengujian; default: Admin API asli.
  source?: PhotoSyncSource;
};

export async function runPhotoSyncDryRun(options: DryRunOptions = {}): Promise<PhotoSyncReport> {
  const prefix = (options.prefix ?? CLOUDINARY_FOLDER_PREFIX).replace(/^\/+|\/+$/g, "");
  const rows = await readPhotoMappingRows();
  const targets = await loadTargets(rows);
  const existing = await loadExistingPhotos();
  const source = options.source ?? (await fetchCloudinarySource(prefix));

  const report = computePhotoSyncPlan({
    prefix,
    overwrite: options.overwrite === true,
    targets,
    assets: source.assets,
    folders: source.folders,
    existing,
  });

  // Daftar folder hanya memperkaya label "folder ada tapi kosong"; kegagalan di
  // sini tidak menghentikan sinkron karena aset sudah cukup untuk mencocokkan.
  if (source.folderFetchFailed) {
    report.warnings.push(
      `Daftar folder Cloudinary tidak terbaca (${source.folderFetchFailed}); folder kosong dianggap belum dibuat.`
    );
  }
  return report;
}

export type ApplyResult = {
  products: number;
  photos: number;
  removed: number;
};

// Tulis rencana (hanya SKU ber-action fill/update). Baris sumber='manual' tidak
// pernah disentuh, dan products.image_urls tidak pernah diubah di sini.
export async function applyPhotoSyncPlan(report: PhotoSyncReport): Promise<ApplyResult> {
  if (report.writePlans.length === 0) {
    return { products: 0, photos: 0, removed: 0 };
  }

  const supabase = getSupabaseServiceClient();
  const ids = report.writePlans.map((plan) => plan.productId);

  for (let i = 0; i < ids.length; i += DELETE_BATCH) {
    const batch = ids.slice(i, i + DELETE_BATCH);
    const { error } = await supabase
      .from("product_photos")
      .delete()
      .eq("sumber", "sync")
      .in("product_id", batch);
    if (error) throw new Error(`Gagal membersihkan foto sinkron: ${error.message}`);
  }

  const now = new Date().toISOString();
  const rows: Record<string, unknown>[] = [];
  report.writePlans.forEach((plan) => {
    plan.photos.forEach((photo) => {
      rows.push({
        product_id: plan.productId,
        public_id: photo.publicId,
        posisi: photo.posisi,
        folder: plan.folder,
        sumber: "sync",
        synced_at: now,
      });
    });
  });

  let inserted = 0;
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const batch = rows.slice(i, i + INSERT_BATCH);
    const { error } = await supabase.from("product_photos").insert(batch);
    if (error) throw new Error(`Gagal menyimpan foto: ${error.message}`);
    inserted += batch.length;
  }

  const removed = report.writePlans.reduce(
    (total, plan) => total + plan.removedPublicIds.length,
    0
  );

  return { products: report.writePlans.length, photos: inserted, removed };
}
