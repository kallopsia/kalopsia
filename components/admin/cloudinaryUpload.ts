// Alur unggah Cloudinary bersama (dipakai ImageManager produk & gambar tunggal
// jasa/sparepart). Unsigned preset bila ada, selain itu signed via /api/cloudinary/sign.
export type CloudinaryUploadConfig = {
  cloudName: string;
  uploadPreset: string;
};

const UPLOAD_ENDPOINT = "https://api.cloudinary.com/v1_1";

export function validateCloudinaryUrl(url: string, cloudName: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "URL tidak valid.";
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") {
    return "URL gambar harus https://res.cloudinary.com/...";
  }
  if (cloudName && !parsed.pathname.startsWith(`/${cloudName}/`)) {
    return `URL gambar harus berada di cloud "${cloudName}".`;
  }
  return null;
}

export async function uploadImageToCloudinary(
  file: File,
  config: CloudinaryUploadConfig
): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  if (config.uploadPreset) {
    form.append("upload_preset", config.uploadPreset);
  } else {
    const signResponse = await fetch("/api/cloudinary/sign", { method: "POST" });
    const signPayload = await signResponse.json().catch(() => ({}));
    if (!signResponse.ok) {
      throw new Error(signPayload?.error || "Gagal meminta signature Cloudinary.");
    }
    form.append("api_key", signPayload.apiKey);
    form.append("timestamp", String(signPayload.timestamp));
    form.append("signature", signPayload.signature);
    form.append("folder", signPayload.folder || "notebook-archive");
  }

  const response = await fetch(`${UPLOAD_ENDPOINT}/${config.cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Upload ke Cloudinary gagal.");
  }
  return String(payload.secure_url);
}

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
