// Engine sinkronisasi foto: menggabungkan pemetaan SKU→folder dengan daftar
// aset nyata dari Cloudinary menjadi rencana tulis. Modul ini murni (tanpa
// jaringan & tanpa database) supaya bisa diuji dan dipakai untuk dry-run.

import { planFolderPhotos, type PhotoAsset } from "./photo-file";
import { CLOUDINARY_FOLDER_PREFIX, isExcludedFolder } from "./photo-config";
import { normalizeFolderName } from "./photo-mapping";
import type { CloudinaryAsset } from "./cloudinary-admin";

export type SyncTarget = {
  productId: string;
  kode_barang: string;
  folder: string;
  folderKey: string;
  // Jumlah URL di products.image_urls — kurasi manual admin.
  manualPhotoCount: number;
};

export type ExistingPhoto = {
  product_id: string;
  public_id: string;
  posisi: number;
  sumber?: "sync" | "manual";
};

export type PhotoSyncInput = {
  targets: SyncTarget[];
  assets: CloudinaryAsset[];
  // Folder yang terdaftar di Cloudinary (hasil /folders di bawah prefix).
  // Hanya untuk membedakan "folder ada tapi kosong" dengan "belum dibuat".
  folders?: string[];
  existing?: ExistingPhoto[];
  overwrite?: boolean;
  prefix?: string;
};

export type PlannedPhoto = {
  publicId: string;
  fileName: string;
  posisi: number;
};

export type SkuPlanAction = "fill" | "update" | "unchanged" | "protected" | "no-photos";

export type SkuPhotoPlan = {
  productId: string;
  kode_barang: string;
  folder: string;
  folderKey: string;
  action: SkuPlanAction;
  photos: PlannedPhoto[];
  removedPublicIds: string[];
  // Baris sinkron lama yang tetap tersimpan padahal folder sudah kosong.
  stalePublicIds: string[];
};

export type EmptyFolder = {
  folderKey: string;
  folder: string;
  existsInCloudinary: boolean;
  skuCount: number;
};

export type SkippedFile = {
  folder: string;
  fileName: string;
  reason: "ekstensi";
};

// SKU yang foldernya kini kosong padahal masih punya baris hasil sinkron lama.
export type StalePhotoSku = {
  kode_barang: string;
  folder: string;
  publicIds: string[];
};

export type PhotoSyncReport = {
  prefix: string;
  overwrite: boolean;
  warnings: string[];
  summary: {
    skusMapped: number;
    assetsRead: number;
    foldersMapped: number;
    foldersEmpty: number;
    foldersOrphan: number;
    foldersExcluded: number;
    skusToWrite: number;
    skusFilled: number;
    skusUpdated: number;
    skusUnchanged: number;
    skusProtected: number;
    skusWithoutPhotos: number;
    skusStalePhotos: number;
    photosToWrite: number;
    photosRemoved: number;
    filesSkipped: number;
    filesTruncated: number;
  };
  plans: SkuPhotoPlan[];
  writePlans: SkuPhotoPlan[];
  emptyFolders: EmptyFolder[];
  stalePhotos: StalePhotoSku[];
  orphanFolders: string[];
  excludedFolders: string[];
  skippedFiles: SkippedFile[];
  truncatedFiles: { folder: string; fileName: string }[];
};

function keyOf(publicIds: string[]): string {
  return publicIds.join("|");
}

function assetsByFolder(assets: CloudinaryAsset[]): Record<string, CloudinaryAsset[]> {
  const grouped: Record<string, CloudinaryAsset[]> = {};
  assets.forEach((asset) => {
    const list = grouped[asset.folderKey] || (grouped[asset.folderKey] = []);
    list.push(asset);
  });
  return grouped;
}

function toPlannedPhotos(photos: PhotoAsset[]): PlannedPhoto[] {
  return photos.map((photo) => ({
    publicId: photo.publicId,
    fileName: photo.fileName,
    posisi: photo.index,
  }));
}

// Rencana tulis/hapus sebuah SKU dibanding kondisi database saat ini.
function decideAction(
  desired: PlannedPhoto[],
  currentSynced: string[],
  manualPhotoCount: number,
  overwrite: boolean
): { action: SkuPlanAction; removedPublicIds: string[]; stalePublicIds: string[] } {
  if (desired.length === 0) {
    // Folder kosong / belum ada: tidak ada yang ditulis dan baris sinkron lama
    // TIDAK otomatis dihapus — kalau folder salah tunejuk, foto yang sudah
    // benar tidak hilang. Baris sisa dilaporkan supaya admin bisa memutuskan.
    return { action: "no-photos", removedPublicIds: [], stalePublicIds: currentSynced.slice() };
  }
  if (keyOf(desired.map((photo) => photo.publicId)) === keyOf(currentSynced)) {
    return { action: "unchanged", removedPublicIds: [], stalePublicIds: [] };
  }
  if (manualPhotoCount > 0 && currentSynced.length === 0 && !overwrite) {
    return { action: "protected", removedPublicIds: [], stalePublicIds: [] };
  }
  return {
    action: currentSynced.length === 0 ? "fill" : "update",
    removedPublicIds: currentSynced.filter(
      (publicId) => !desired.some((photo) => photo.publicId === publicId)
    ),
    stalePublicIds: [],
  };
}

export function computePhotoSyncPlan(input: PhotoSyncInput): PhotoSyncReport {
  const prefix = (input.prefix ?? CLOUDINARY_FOLDER_PREFIX).replace(/^\/+|\/+$/g, "");
  const overwrite = input.overwrite === true;
  const grouped = assetsByFolder(input.assets || []);

  const existingByProduct: Record<string, ExistingPhoto[]> = {};
  (input.existing || []).forEach((row) => {
    if (row.sumber === "manual") return;
    const list = existingByProduct[row.product_id] || (existingByProduct[row.product_id] = []);
    list.push(row);
  });

  // Hasil parsing folder dihitung sekali per folder, dipakai bersama oleh
  // semua SKU yang menunjuk folder itu.
  const folderPlans: Record<string, ReturnType<typeof planFolderPhotos>> = {};
  const folderOfKey: Record<string, string> = {};

  input.targets.forEach((target) => {
    if (folderPlans[target.folderKey]) return;
    const assets = grouped[target.folderKey] || [];
    folderPlans[target.folderKey] = planFolderPhotos(
      target.folder,
      assets.map((asset) => ({ fileName: asset.fileName, publicId: asset.publicId })),
      { prefix }
    );
    folderOfKey[target.folderKey] = target.folder;
  });

  const plans: SkuPhotoPlan[] = [];
  const emptyCount: Record<string, number> = {};

  input.targets.forEach((target) => {
    const folderPlan = folderPlans[target.folderKey];
    const photos = toPlannedPhotos(folderPlan ? folderPlan.photos : []);
    const current = (existingByProduct[target.productId] || [])
      .slice()
      .sort((a, b) => a.posisi - b.posisi || a.public_id.localeCompare(b.public_id));
    const decision = decideAction(
      photos,
      current.map((row) => row.public_id),
      target.manualPhotoCount,
      overwrite
    );

    if (photos.length === 0) {
      emptyCount[target.folderKey] = (emptyCount[target.folderKey] || 0) + 1;
    }

    plans.push({
      productId: target.productId,
      kode_barang: target.kode_barang,
      folder: target.folder,
      folderKey: target.folderKey,
      action: decision.action,
      photos,
      removedPublicIds: decision.removedPublicIds,
      stalePublicIds: decision.stalePublicIds,
    });
  });

  const knownFolderPaths: Record<string, string> = {};
  (input.folders || []).forEach((path) => {
    knownFolderPaths[normalizeFolderName(path)] = path;
  });

  const mappedKeys = new Set(input.targets.map((target) => target.folderKey));

  const emptyFolders: EmptyFolder[] = Object.keys(emptyCount).map((folderKey) => ({
    folderKey,
    folder: folderOfKey[folderKey] || folderKey,
    existsInCloudinary: Boolean(knownFolderPaths[folderKey]) || grouped[folderKey] !== undefined,
    skuCount: emptyCount[folderKey],
  }));
  emptyFolders.sort(
    (a, b) => b.skuCount - a.skuCount || a.folderKey.localeCompare(b.folderKey)
  );

  // Yatim = folder yang benar-benar berisi foto tapi tidak ditunjuk SKU mana pun.
  // Folder kosong (mis. wadah per brand) tidak dilaporkan di sini.
  const orphanFolders: string[] = [];
  const excludedFolders: string[] = [];
  Object.keys(grouped).forEach((folderKey) => {
    if (mappedKeys.has(folderKey)) return;
    const label = grouped[folderKey][0].folderPath || folderKey;
    if (isExcludedFolder(label) || isExcludedFolder(folderKey)) excludedFolders.push(label);
    else orphanFolders.push(label);
  });
  orphanFolders.sort();
  excludedFolders.sort();

  const skippedFiles: SkippedFile[] = [];
  const truncatedFiles: { folder: string; fileName: string }[] = [];
  Object.keys(folderPlans).forEach((folderKey) => {
    const plan = folderPlans[folderKey];
    (plan?.skipped || []).forEach((item) =>
      skippedFiles.push({ folder: folderOfKey[folderKey], fileName: item.fileName, reason: item.reason })
    );
    (plan?.truncated || []).forEach((fileName) =>
      truncatedFiles.push({ folder: folderOfKey[folderKey], fileName })
    );
  });
  skippedFiles.sort((a, b) => a.folder.localeCompare(b.folder) || a.fileName.localeCompare(b.fileName));
  truncatedFiles.sort((a, b) => a.folder.localeCompare(b.folder) || a.fileName.localeCompare(b.fileName));

  const writePlans = plans.filter(
    (plan) => plan.action === "fill" || plan.action === "update"
  );

  const stalePhotos: StalePhotoSku[] = plans
    .filter((plan) => plan.stalePublicIds.length > 0)
    .map((plan) => ({
      kode_barang: plan.kode_barang,
      folder: plan.folder,
      publicIds: plan.stalePublicIds,
    }));

  const count = (action: SkuPlanAction) =>
    plans.filter((plan) => plan.action === action).length;

  // Laporan "0 aset" tanpa penjelasan membingungkan: admin bisa mengira
  // pemetaannya rusak padahal folder di Cloudinary memang masih kosong.
  const warnings: string[] = [];
  const assetCount = (input.assets || []).length;
  if (assetCount === 0 && plans.length > 0) {
    warnings.push(
      `Tidak ada satu pun aset foto terbaca di bawah prefix "${prefix}/" — ` +
        `semua SKU dilaporkan tanpa foto. Periksa apakah foto sudah diunggah ke folder itu.`
    );
  } else if (assetCount > 0 && orphanFolders.length > 0 && mappedKeys.size > 0) {
    const matched = Object.keys(grouped).filter((folderKey) => mappedKeys.has(folderKey)).length;
    if (matched === 0) {
      warnings.push(
        `${assetCount} aset terbaca tapi tidak ada yang cocok dengan folder pemetaan — ` +
          `bandingkan nama folder di Cloudinary dengan kolom "Nama Folder" (lihat daftar folder yatim).`
      );
    }
  }

  return {
    prefix,
    overwrite,
    warnings,
    summary: {
      skusMapped: plans.length,
      assetsRead: (input.assets || []).length,
      foldersMapped: mappedKeys.size,
      foldersEmpty: emptyFolders.length,
      foldersOrphan: orphanFolders.length,
      foldersExcluded: excludedFolders.length,
      skusToWrite: writePlans.length,
      skusFilled: count("fill"),
      skusUpdated: count("update"),
      skusUnchanged: count("unchanged"),
      skusProtected: count("protected"),
      skusWithoutPhotos: count("no-photos"),
      skusStalePhotos: stalePhotos.length,
      photosToWrite: writePlans.reduce((total, plan) => total + plan.photos.length, 0),
      photosRemoved: writePlans.reduce((total, plan) => total + plan.removedPublicIds.length, 0),
      filesSkipped: skippedFiles.length,
      filesTruncated: truncatedFiles.length,
    },
    plans,
    writePlans,
    emptyFolders,
    stalePhotos,
    orphanFolders,
    excludedFolders,
    skippedFiles,
    truncatedFiles,
  };
}
