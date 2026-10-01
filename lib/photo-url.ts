// Bangun URL Cloudinary dari public_id. Database hanya menyimpan public_id,
// jadi transformasi/optimasi bisa diubah di satu tempat tanpa migrasi ulang.

import type { ProductPhotoRow } from "@/types/product-photo";

export const CLOUDINARY_IMAGE_PATH = "image/upload";

// f_auto = format terbaik per browser (webp/avif), q_auto = kualitas adaptif.
export const PHOTO_TRANSFORMATIONS = "f_auto,q_auto";

export function cloudinaryCloudName(): string {
  return (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "").trim();
}

// URL dasar sebuah foto. Kosong bila CLOUD_NAME belum diisi (caller fallback
// ke placeholder) — tidak pernah menebak cloud lain.
export function photoUrl(publicId: string, transformations = PHOTO_TRANSFORMATIONS): string {
  const id = (publicId || "").trim().replace(/^\/+|\/+$/g, "");
  const cloud = cloudinaryCloudName();
  if (!id || !cloud) return "";
  const parts = [transformations, id].filter(Boolean);
  return `https://res.cloudinary.com/${cloud}/${CLOUDINARY_IMAGE_PATH}/${parts.join("/")}`;
}

const TRANSFORMATION_SEGMENT_RE = /^(v\d+|.*[,=].*)$/;

// URL Cloudinary → public_id (kebalikan dari photoUrl). Versi (v123...) dan
// segmen transformasi dibuang, ekstensi ikut dilepas.
export function publicIdFromUrl(url: string): string | null {
  const value = (url || "").trim();
  if (!value) return null;
  let path: string;
  try {
    const parsed = new URL(value);
    if (parsed.hostname !== "res.cloudinary.com") return null;
    const index = parsed.pathname.indexOf(`/${CLOUDINARY_IMAGE_PATH}/`);
    if (index === -1) return null;
    path = parsed.pathname.slice(index + CLOUDINARY_IMAGE_PATH.length + 2);
  } catch {
    return null;
  }

  const segments = path.split("/").filter(Boolean);
  let cursor = 0;
  while (cursor < segments.length && TRANSFORMATION_SEGMENT_RE.test(segments[cursor])) cursor += 1;
  const rest = segments.slice(cursor);
  if (rest.length === 0) return null;

  const lastDot = rest[rest.length - 1].lastIndexOf(".");
  if (lastDot > 0) rest[rest.length - 1] = rest[rest.length - 1].slice(0, lastDot);
  return rest.join("/");
}

export type PhotoRef = Pick<ProductPhotoRow, "public_id"> & { posisi?: number };

// Foto tampil = kurasi manual admin (products.image_urls) lebih dulu, lalu hasil
// sinkron yang belum ada. Dengan begitu sinkron tidak pernah menimpa / menggeser
// gambar yang sudah diatur manual, termasuk gambar utamanya.
export function mergeProductPhotos(
  imageUrls: string[] | null | undefined,
  photoRows: PhotoRef[] | null | undefined
): string[] {
  const manual = (imageUrls || []).filter(Boolean);
  const seen = new Set<string>();
  manual.forEach((url) => {
    const id = publicIdFromUrl(url);
    if (id) seen.add(id);
  });

  const ordered = (photoRows || []).slice().sort((a, b) => (a.posisi || 0) - (b.posisi || 0));
  const merged = manual.slice();

  ordered.forEach((photo) => {
    const id = (photo.public_id || "").trim();
    if (!id || seen.has(id)) return;
    const url = photoUrl(id);
    if (!url) return;
    seen.add(id);
    merged.push(url);
  });

  return merged;
}
