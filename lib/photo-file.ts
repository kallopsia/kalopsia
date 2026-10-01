// Aturan penamaan berkas foto di dalam folder Cloudinary.
// Satu folder berisi 1.jpg, 2.jpg, 3.png, ... — angka menentukan urutan,
// berkas bernomor 1 adalah foto utama.

import { CLOUDINARY_FOLDER_PREFIX } from "./photo-config";

export const PHOTO_EXTENSIONS: readonly string[] = ["jpg", "jpeg", "png", "webp"];

// Batas foto per produk, berlaku untuk galeri manual admin maupun hasil sinkron.
export const MAX_PRODUCT_PHOTOS = 24;

const PHOTO_NAME_RE = /^(\d+)\.(jpe?g|png|webp)$/i;

export type ParsedPhotoName = {
  index: number;
  extension: string;
  // Nama berkas tanpa ekstensi — bagian publik_id di dalam folder.
  baseName: string;
};

export type PhotoAsset = {
  index: number;
  fileName: string;
  publicId: string;
};

export type SkippedPhotoFile = {
  fileName: string;
  reason: "pola" | "ekstensi";
};

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

// "1.jpg" → index 1, "07.png" → index 7, "10.webp" → index 10.
// "foto depan.jpg" dan "1.heic" → null (tidak cocok pola numerik berekstensi foto).
export function parsePhotoFileName(fileName: string): ParsedPhotoName | null {
  const name = (fileName || "").trim();
  const match = PHOTO_NAME_RE.exec(name);
  if (!match) return null;
  const index = Number(match[1]);
  if (!Number.isFinite(index) || index <= 0) return null;
  return {
    index,
    extension: match[2].toLowerCase(),
    baseName: name.slice(0, name.length - match[2].length - 1),
  };
}

// Urut numerik (2 sebelum 10). Seri dipecah dengan perbandingan nama supaya
// hasil sinkron stabil antar jalankan.
export function comparePhotoAssets(a: PhotoAsset, b: PhotoAsset): number {
  if (a.index !== b.index) return a.index - b.index;
  return a.fileName.toLowerCase().localeCompare(b.fileName.toLowerCase());
}

export function sortPhotoAssets(assets: PhotoAsset[]): PhotoAsset[] {
  return assets.slice().sort(comparePhotoAssets);
}

// public_id sebuah foto: {prefix}/{folder}/{baseName}, tanpa ekstensi.
export function photoPublicId(prefix: string, folder: string, baseName: string): string {
  const cleanFolder = (folder || "").replace(/^\/+|\/+$/g, "");
  return [prefix, cleanFolder, baseName].filter(Boolean).join("/");
}

// Masuk: nama berkas satu folder dari Cloudinary. Keluar: foto terurut untuk
// satu SKU + daftar berkas yang dilewati (dilaporkan, tidak pernah disimpan).
export function planFolderPhotos(
  folder: string,
  fileNames: string[],
  options?: { prefix?: string; limit?: number }
): FolderPhotoPlan {
  const prefix = options?.prefix ?? CLOUDINARY_FOLDER_PREFIX;
  const limit = options?.limit ?? MAX_PRODUCT_PHOTOS;

  const parsed: PhotoAsset[] = [];
  const skipped: SkippedPhotoFile[] = [];

  (fileNames || []).forEach((rawFileName) => {
    const fileName = (rawFileName || "").trim();
    if (!fileName) return;
    const info = parsePhotoFileName(fileName);
    if (info) {
      parsed.push({
        index: info.index,
        fileName,
        publicId: photoPublicId(prefix, folder, info.baseName),
      });
      return;
    }
    skipped.push({
      fileName,
      reason: isPhotoExtension(fileName) ? "pola" : "ekstensi",
    });
  });

  const ordered = sortPhotoAssets(parsed);
  return {
    folder,
    photos: ordered.slice(0, limit),
    skipped,
    truncated: ordered.slice(limit).map((photo) => photo.fileName),
  };
}
