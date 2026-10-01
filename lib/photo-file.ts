// Aturan berkas foto di dalam folder Cloudinary.
// Urutan: berkas bernama angka (1.jpg, 2.png, 10.webp) lebih dulu sesuai
// nilainya — berkas `1` jadi foto utama — lalu berkas bernama lain urut
// abjad-natural (asus, asus1, asus2, asus10). Semua berkas gambar dipakai;
// hanya ekstensi non-gambar yang dilewati dan dilaporkan.

import { CLOUDINARY_FOLDER_PREFIX } from "./photo-config";

export const PHOTO_EXTENSIONS: readonly string[] = ["jpg", "jpeg", "png", "webp", "avif"];

// Batas foto per produk, berlaku untuk galeri manual admin maupun hasil sinkron.
export const MAX_PRODUCT_PHOTOS = 24;

const NUMERIC_NAME_RE = /^(\d+)\./;

export type PhotoAsset = {
  // Posisi urut 1..n hasil pengurutan (dipakai sebagai product_photos.posisi).
  index: number;
  fileName: string;
  publicId: string;
};

export type SkippedPhotoFile = {
  fileName: string;
  reason: "ekstensi";
};

// publicId sebaiknya diambil dari hasil listing Cloudinary (sumber kebenaran);
// kalau tidak ada, dibangun dari prefix + folder + nama berkas.
export type PhotoFileInput = string | { fileName: string; publicId?: string };

export type FolderPhotoPlan = {
  folder: string;
  photos: PhotoAsset[];
  skipped: SkippedPhotoFile[];
  truncated: string[];
};

export function photoExtension(fileName: string): string {
  const match = /\.([A-Za-z0-9]+)$/.exec((fileName || "").trim());
  return match ? match[1].toLowerCase() : "";
}

export function isPhotoExtension(fileName: string): boolean {
  return PHOTO_EXTENSIONS.includes(photoExtension(fileName));
}

// "1.jpg" → 1, "07.png" → 7, "asus2.webp" → null (bukan nama berawalan angka).
export function photoNameOrder(fileName: string): number | null {
  const match = NUMERIC_NAME_RE.exec((fileName || "").trim());
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

// Perbandingan sadar-angka: "asus2" < "asus10", "asus" < "asus2".
export function naturalCompareNames(a: string, b: string): number {
  const left = (a || "").toLowerCase();
  const right = (b || "").toLowerCase();
  const leftParts = left.match(/\d+|\D/g) || [];
  const rightParts = right.match(/\d+|\D/g) || [];
  const shared = Math.min(leftParts.length, rightParts.length);

  for (let i = 0; i < shared; i += 1) {
    const leftIsDigit = /^\d/.test(leftParts[i]);
    const rightIsDigit = /^\d/.test(rightParts[i]);
    if (leftIsDigit && rightIsDigit) {
      const diff = Number(leftParts[i]) - Number(rightParts[i]);
      if (diff !== 0) return diff;
    } else if (leftParts[i] !== rightParts[i]) {
      return leftParts[i] < rightParts[i] ? -1 : 1;
    }
  }

  if (leftParts.length !== rightParts.length) return leftParts.length - rightParts.length;
  return left < right ? -1 : left > right ? 1 : 0;
}

type SortableFile = { fileName: string; publicId: string; order: number | null };

// Nama berangka menang (urut nilainya), sisanya urut abjad-natural.
function compareFiles(a: SortableFile, b: SortableFile): number {
  if (a.order !== null && b.order !== null && a.order !== b.order) return a.order - b.order;
  if (a.order !== null && b.order === null) return -1;
  if (a.order === null && b.order !== null) return 1;
  return naturalCompareNames(a.fileName, b.fileName);
}

// public_id sebuah foto: {prefix}/{folder}/{baseName}, tanpa ekstensi.
export function photoPublicId(prefix: string, folder: string, baseName: string): string {
  const cleanFolder = (folder || "").replace(/^\/+|\/+$/g, "");
  return [prefix, cleanFolder, baseName].filter(Boolean).join("/");
}

// Masuk: daftar berkas satu folder dari Cloudinary. Keluar: foto terurut untuk
// satu SKU + daftar berkas yang dilewati (dilaporkan, tidak pernah disimpan).
export function planFolderPhotos(
  folder: string,
  files: PhotoFileInput[],
  options?: { prefix?: string; limit?: number }
): FolderPhotoPlan {
  const prefix = options?.prefix ?? CLOUDINARY_FOLDER_PREFIX;
  const limit = options?.limit ?? MAX_PRODUCT_PHOTOS;

  const accepted: SortableFile[] = [];
  const skipped: SkippedPhotoFile[] = [];

  (files || []).forEach((raw) => {
    const input = typeof raw === "string" ? { fileName: raw } : raw;
    const fileName = (input.fileName || "").trim();
    if (!fileName) return;
    if (!isPhotoExtension(fileName)) {
      skipped.push({ fileName, reason: "ekstensi" });
      return;
    }
    const baseName = fileName.replace(/\.[^.]+$/, "");
    accepted.push({
      fileName,
      publicId: (input.publicId || "").trim() || photoPublicId(prefix, folder, baseName),
      order: photoNameOrder(fileName),
    });
  });

  const ordered = accepted.slice().sort(compareFiles);
  return {
    folder,
    photos: ordered.slice(0, limit).map((file, position) => ({
      index: position + 1,
      fileName: file.fileName,
      publicId: file.publicId,
    })),
    skipped,
    truncated: ordered.slice(limit).map((file) => file.fileName),
  };
}
