// Sisi server untuk sinkronisasi foto: baca pemetaan + produk, tanya Cloudinary
// Admin API (hanya di sini, tidak pernah dari frontend), lalu tulis hasilnya.

import { getSupabaseServiceClient } from "./supabase/service";
import { readPhotoMappingRows } from "./admin-photo-mapping";
import { joinMappingToProducts, type PhotoMappingRow } from "./photo-mapping";
import { CLOUDINARY_FOLDER_PREFIX } from "./photo-config";
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

export type PhotoStats = {
  // Baris hasil sinkron vs kurasi manual di product_photos.
  syncRows: number;
  manualRows: number;
  skusWithPhotos: number;
  lastSyncedAt: string | null;
  // Produk yang sudah punya pemetaan folder tapi belum punya foto sinkron.
  skusMapped: number;
  skusWithoutAnyPhoto: number;
};

type ExistingPhotoRow = ExistingPhoto & { synced_at: string | null };

// Angka-angka kecil untuk kartu ringkasan di halaman admin.
export async function photoStats(): Promise<PhotoStats> {
  const [photos, products] = await Promise.all([loadExistingPhotos(), loadProductsForPhotos()]);
  const rows = await readPhotoMappingRows();
  const mappedIds = new Set(
    joinMappingToProducts(
      rows,
      products.map((product) => ({ id: product.id, kode_barang: product.kode_barang }))
    ).targets.map((target) => target.productId)
  );

  const withPhotos: Record<string, true> = {};
  let syncRows = 0;
  let manualRows = 0;
  let lastSyncedAt: string | null = null;
  photos.forEach((row) => {
    withPhotos[row.product_id] = true;
    if (row.sumber === "manual") manualRows += 1;
    else syncRows += 1;
    if (row.synced_at && (!lastSyncedAt || row.synced_at > lastSyncedAt)) {
      lastSyncedAt = row.synced_at;
    }
  });

  return {
    syncRows,
    manualRows,
    skusWithPhotos: Object.keys(withPhotos).length,
    lastSyncedAt,
    skusMapped: mappedIds.size,
    skusWithoutAnyPhoto: products.filter(
      (product) => !withPhotos[product.id] && (product.image_urls || []).length === 0
    ).length,
  };
}

async function loadProductsForPhotos(): Promise<ProductPhotoSourceRow[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from("products").select("id,kode_barang,image_urls");
  if (error) throw new Error(`Gagal membaca produk: ${error.message}`);
  return (data || []) as ProductPhotoSourceRow[];
}

async function loadTargets(rows: PhotoMappingRow[]): Promise<SyncTarget[]> {
  const products = await loadProductsForPhotos();
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

async function loadExistingPhotos(): Promise<ExistingPhotoRow[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("product_photos")
    .select("product_id,public_id,posisi,sumber,synced_at");
  if (error) {
    throw new Error(
      `Gagal membaca product_photos: ${error.message}. ` +
        `Pastikan migrasi 20261007000000_product_photos.sql sudah dijalankan.`
    );
  }
  return (
    (data || []) as {
      product_id: string;
      public_id: string;
      posisi: number;
      sumber: string;
      synced_at: string | null;
    }[]
  ).map((row) => ({
    product_id: row.product_id,
    public_id: row.public_id,
    posisi: row.posisi,
    synced_at: row.synced_at,
    sumber: row.sumber === "manual" ? "manual" : ("sync" as const),
  }));
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
