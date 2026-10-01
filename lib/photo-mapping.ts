// Pemetaan SKU → folder Cloudinary (sheet "Pemetaan SKU": kolom A KODEBARANG,
// kolom B nama folder). Pemetaan tidak pernah ditebak dari nama produk —
// satu folder bisa dipakai banyak SKU (model + warna sama, RAM/SSD beda).

import { stripKodePrefix } from "./kode-barang";
import { isExcludedFolder, isExcludedKodeBarang } from "./photo-config";

export type PhotoMappingInput = {
  rowNumber?: number | null;
  kode_barang: string;
  folder: string;
};

export type PhotoMappingRow = {
  kode_barang: string;
  folder: string;
};

export type MappingIssue = {
  rowNumber: number | null;
  message: string;
};

export type NormalizedMapping = {
  rows: PhotoMappingRow[];
  issues: MappingIssue[];
  excludedCount: number;
  duplicateCount: number;
};

// Kunci folder: tanpa besar/kecil, spasi ekstra diabaikan, wrap (prefix dan/atau
// slash) dibuang supaya "laptop/PR-LAP-AC-X/" cocok dengan "PR-LAP-AC-X".
export function normalizeFolderName(folder: string): string {
  const withoutSpaces = (folder || "").trim().replace(/\s+/g, " ");
  const segments = withoutSpaces
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const core = segments[segments.length - 1] || "";
  return core.toLowerCase();
}

// Kunci SKU: prefix lama PR-LAP-<BRAND>- dibuang (DB menyimpan tanpa prefix),
// lalu dinormalisasi besar/kecil supaya berkas lama tetap cocok.
export function mappingKodeKey(kode_barang: string): string {
  return stripKodePrefix((kode_barang || "").trim()).toUpperCase();
}

export function isExcludedMappingRow(row: { kode_barang: string; folder: string }): boolean {
  return isExcludedKodeBarang(row.kode_barang) || isExcludedFolder(row.folder);
}

// Buang baris rusak & brand yang sudah tidak dijual; baris dengan SKU sama
// dianggap pembaruan (baris terakhir menang) dan dicatat sebagai duplikat.
export function normalizeMappingRows(inputs: PhotoMappingInput[]): NormalizedMapping {
  const byKode = new Map<string, PhotoMappingRow>();
  const issues: MappingIssue[] = [];
  let excludedCount = 0;
  let duplicateCount = 0;

  (inputs || []).forEach((input, index) => {
    const rowNumber = input.rowNumber ?? index + 1;
    const kodeBarang = stripKodePrefix((input.kode_barang || "").trim());
    const folder = (input.folder || "").trim().replace(/\s+/g, " ");

    if (!kodeBarang) {
      issues.push({ rowNumber, message: "KODEBARANG kosong, baris dilewati." });
      return;
    }
    if (!folder) {
      issues.push({
        rowNumber,
        message: `Folder kosong untuk "${kodeBarang}", baris dilewati.`,
      });
      return;
    }
    if (isExcludedMappingRow({ kode_barang: kodeBarang, folder })) {
      excludedCount += 1;
      return;
    }

    const key = mappingKodeKey(kodeBarang);
    if (byKode.has(key)) duplicateCount += 1;
    byKode.set(key, { kode_barang: kodeBarang, folder });
  });

  const rows: PhotoMappingRow[] = [];
  byKode.forEach((row) => rows.push(row));
  rows.sort((a, b) => a.kode_barang.localeCompare(b.kode_barang));

  return { rows, issues, excludedCount, duplicateCount };
}

export type MappingProduct = {
  id: string;
  kode_barang: string;
};

export type MappingTarget = {
  productId: string;
  kode_barang: string;
  folder: string;
  folderKey: string;
};

export type MappingJoinResult = {
  targets: MappingTarget[];
  // SKU yang ada di pemetaan tapi tidak ada di database: dilaporkan, bukan error.
  unknownSkus: PhotoMappingRow[];
  folderKeys: string[];
};

// Gabungkan pemetaan dengan produk di DB. Produk yang tidak punya pemetaan
// tidak masuk target (foto biarkan seperti adanya).
export function joinMappingToProducts(
  rows: PhotoMappingRow[],
  products: MappingProduct[]
): MappingJoinResult {
  const productByKey = new Map<string, MappingProduct>();
  products.forEach((product) => {
    const key = mappingKodeKey(product.kode_barang);
    if (!productByKey.has(key)) productByKey.set(key, product);
  });

  const targets: MappingTarget[] = [];
  const unknownSkus: PhotoMappingRow[] = [];

  rows.forEach((row) => {
    const product = productByKey.get(mappingKodeKey(row.kode_barang));
    if (!product) {
      unknownSkus.push(row);
      return;
    }
    targets.push({
      productId: product.id,
      kode_barang: row.kode_barang,
      folder: row.folder,
      folderKey: normalizeFolderName(row.folder),
    });
  });

  targets.sort((a, b) => a.kode_barang.localeCompare(b.kode_barang));

  const folderKeySet = new Set<string>();
  const folderLabels = new Map<string, string>();
  targets.forEach((target) => {
    if (folderKeySet.has(target.folderKey)) return;
    folderKeySet.add(target.folderKey);
    folderLabels.set(target.folderKey, target.folder);
  });

  return {
    targets,
    unknownSkus: unknownSkus.sort((a, b) => a.kode_barang.localeCompare(b.kode_barang)),
    folderKeys: Array.from(folderKeySet).sort(),
  };
}

// Satu folder → daftar SKU yang memakai foto yang sama.
export function skusByFolder(targets: MappingTarget[]): Record<string, MappingTarget[]> {
  const grouped: Record<string, MappingTarget[]> = {};
  targets.forEach((target) => {
    const list = grouped[target.folderKey] || (grouped[target.folderKey] = []);
    list.push(target);
  });
  return grouped;
}

export function countByFolder(targets: MappingTarget[]): { folderKey: string; count: number }[] {
  const grouped = skusByFolder(targets);
  return Object.keys(grouped)
    .map((folderKey) => ({ folderKey, count: grouped[folderKey].length }))
    .sort((a, b) => b.count - a.count || a.folderKey.localeCompare(b.folderKey));
}
