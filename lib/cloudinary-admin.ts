// Pemanggil Cloudinary Admin API untuk membaca daftar foto.
// Server-only: CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET dipakai lewat header
// Basic auth di proses server dan tidak pernah dikirim ke frontend.

import { normalizeFolderName } from "./photo-mapping";

const ADMIN_API_VERSION = "v1_1";
const PAGE_SIZE = 500;
// Pengaman agar listing tidak pernah berputar terus-menerus kalau cursor macet.
const MAX_PAGES = 200;

export type CloudinaryAdminConfig = {
  cloudName: string;
  apiBase: string;
  authHeader: string;
};

export type CloudinaryAsset = {
  publicId: string;
  // Path folder penuh, mis. "laptop/PR-LAP-AC-X".
  folderPath: string;
  // Kunci pencocokan dengan kolom folder pemetaan (huruf kecil, tanpa prefix).
  folderKey: string;
  fileName: string;
  format: string;
};

// Respon minimum yang dipakai requestPage — cukup untuk stub di test.
export type FetchLike = (input: string, init?: { headers?: Record<string, string> }) => Promise<{
  status: number;
  ok: boolean;
  json: () => Promise<Record<string, unknown>>;
}>;

export function cloudinaryAdminConfig(): CloudinaryAdminConfig {
  const cloudName = (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || "").trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary Admin API butuh NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET di server."
    );
  }

  return {
    cloudName,
    apiBase: `https://api.cloudinary.com/${ADMIN_API_VERSION}/${encodeURIComponent(cloudName)}`,
    authHeader: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
  };
}

export function folderPathOf(publicId: string): string {
  const segments = (publicId || "").split("/");
  return segments.length > 1 ? segments.slice(0, -1).join("/") : "";
}

// "laptop/PR-LAP-AC-X/1" → "pr-lap-ac-x" (segmen folder terakhir, huruf kecil).
export function folderKeyOf(publicId: string): string {
  return normalizeFolderName(folderPathOf(publicId));
}

function baseFileName(publicId: string, format: string): string {
  const base = (publicId || "").split("/").pop() || "";
  return format ? `${base}.${format}` : base;
}

function toAsset(value: Record<string, unknown>): CloudinaryAsset | null {
  const publicId = String(value.public_id || "").trim();
  if (!publicId) return null;
  const format = String(value.format || "").trim().toLowerCase();
  return {
    publicId,
    folderPath: folderPathOf(publicId),
    folderKey: folderKeyOf(publicId),
    fileName: baseFileName(publicId, format),
    format,
  };
}

async function requestPage(
  path: string,
  params: Record<string, string | number>,
  config: CloudinaryAdminConfig,
  fetchImpl: FetchLike
): Promise<Record<string, unknown>> {
  const query = Object.keys(params)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
    .join("&");
  const response = await fetchImpl(`${config.apiBase}${path}?${query}`, {
    headers: { Authorization: config.authHeader },
  });
  const body: Record<string, unknown> = await response.json().catch(() => ({}));
  const error = body.error as { message?: string } | undefined;
  if (!response.ok) {
    // Pesan Cloudinary saja: tidak pernah menyertakan kredensial.
    throw new Error(
      `Cloudinary Admin API ${response.status}: ${(error && error.message) || "tidak ada detail"}`
    );
  }
  return body;
}

// Daftar seluruh gambar di bawah prefix (rekursif, termasuk subfolder),
// dihalaman dengan next_cursor sampai habis.
export async function listImageAssets(
  prefix: string,
  options?: { config?: CloudinaryAdminConfig; fetchImpl?: FetchLike }
): Promise<CloudinaryAsset[]> {
  const config = options?.config ?? cloudinaryAdminConfig();
  const fetchImpl = options?.fetchImpl ?? (fetch as unknown as FetchLike);
  const cleanPrefix = (prefix || "").replace(/^\/+|\/+$/g, "");

  const assets: CloudinaryAsset[] = [];
  let cursor = "";

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params: Record<string, string | number> = {
      prefix: cleanPrefix ? `${cleanPrefix}/` : "",
      max_results: PAGE_SIZE,
    };
    if (cursor) params.next_cursor = cursor;

    const body = await requestPage("/resources/image/upload", params, config, fetchImpl);
    const list = (body.resources || []) as Record<string, unknown>[];
    list.forEach((value) => {
      const asset = toAsset(value);
      if (asset) assets.push(asset);
    });

    const next = body.next_cursor;
    if (!next || typeof next !== "string") break;
    cursor = next;
  }

  return assets;
}

// Nama subfolder langsung di bawah prefix — dipakai untuk membedakan folder
// pemetaan yang sudah dibuat tapi kosong dengan yang belum dibuat sama sekali.
export async function listChildFolders(
  prefix: string,
  options?: { config?: CloudinaryAdminConfig; fetchImpl?: FetchLike }
): Promise<string[]> {
  const config = options?.config ?? cloudinaryAdminConfig();
  const fetchImpl = options?.fetchImpl ?? (fetch as unknown as FetchLike);
  const cleanPrefix = (prefix || "").replace(/^\/+|\/+$/g, "");

  const folders: string[] = [];
  let cursor = "";

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params: Record<string, string | number> = { max_results: PAGE_SIZE };
    if (cursor) params.next_cursor = cursor;

    const body = await requestPage(
      `/folders/${encodeURIComponent(cleanPrefix)}`,
      params,
      config,
      fetchImpl
    );
    const list = (body.folders || []) as Record<string, unknown>[];
    list.forEach((folder) => {
      const path = String(folder.path || "").trim();
      if (path) folders.push(path);
    });

    const next = body.next_cursor;
    if (!next || typeof next !== "string") break;
    cursor = next;
  }

  return folders;
}
