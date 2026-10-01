// Pemanggil Cloudinary Admin API untuk membaca daftar foto.
// Server-only: CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET dipakai lewat header
// Basic auth di proses server dan tidak pernah dikirim ke frontend.

import { normalizeFolderName } from "./photo-mapping";

const ADMIN_API_VERSION = "v1_1";
const PAGE_SIZE = 500;
// Pengaman agar listing tidak pernah berputar terus-menerus kalau cursor macet.
const MAX_PAGES = 200;
// Batas jumlah folder per tingkat sebelum berhenti menelusuri lebih dalam,
// supaya penelusuran folder tidak meledak jadi ratusan request.
const MAX_DESCEND_BREADTH = 50;

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

// Respon minimum yang dipakai requestApi — cukup untuk stub di test.
export type FetchLike = (
  input: string,
  init?: { headers?: Record<string, string>; method?: string; body?: string }
) => Promise<{
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

function withFormat(name: string, format: string): string {
  if (!name) return "";
  return format ? `${name}.${format}` : name;
}

// Aset yang dipindah lewat Media Library tetap memakai public_id datar
// (mis. "macbook_1"), sedangkan foldernya hanya ada di asset_folder dan nama
// berkasnya di display_name. Karena itu folder & nama dibaca dari kedua field
// itu dulu, baru diturunkan dari public_id sebagai cadangan.
function toAsset(value: Record<string, unknown>): CloudinaryAsset | null {
  const publicId = String(value.public_id || "").trim();
  if (!publicId) return null;
  const format = String(value.format || "").trim().toLowerCase();
  const assetFolder = String(value.asset_folder || "").trim();
  const displayName = String(value.display_name || "").trim();
  const folderPath = assetFolder || folderPathOf(publicId);

  return {
    publicId,
    folderPath,
    folderKey: normalizeFolderName(folderPath),
    fileName: withFormat(displayName, format) || baseFileName(publicId, format),
    format,
  };
}

async function requestApi(
  path: string,
  request: { query?: Record<string, string | number>; body?: Record<string, unknown> },
  config: CloudinaryAdminConfig,
  fetchImpl: FetchLike
): Promise<Record<string, unknown>> {
  const query = Object.keys(request.query || {})
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(request.query![key]))}`)
    .join("&");
  const url = `${config.apiBase}${path}${query ? `?${query}` : ""}`;
  const headers: Record<string, string> = { Authorization: config.authHeader };
  const init: { headers: Record<string, string>; method?: string; body?: string } = { headers };
  if (request.body) {
    init.method = "POST";
    init.body = JSON.stringify(request.body);
    headers["Content-Type"] = "application/json";
  }

  const response = await fetchImpl(url, init);
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

// Ekspresi Search API: semua gambar di bawah prefix, rekursif. Folder dibaca
// dari asset_folder sehingga aset hasil "pindah folder" di Media Library ikut
// terbaca (public_id-nya tidak berubah saat dipindah).
export function searchExpressionForPrefix(prefix: string): string {
  const clean = (prefix || "").replace(/^\/+|\/+$/g, "").replace(/"/g, "");
  return clean ? `folder:"${clean}*" AND resource_type:image` : "resource_type:image";
}

// Daftar seluruh gambar di bawah prefix (rekursif, termasuk subfolder),
// dihalaman dengan next_cursor sampai habis.
export async function listImageAssets(
  prefix: string,
  options?: { config?: CloudinaryAdminConfig; fetchImpl?: FetchLike }
): Promise<CloudinaryAsset[]> {
  const config = options?.config ?? cloudinaryAdminConfig();
  const fetchImpl = options?.fetchImpl ?? (fetch as unknown as FetchLike);
  const expression = searchExpressionForPrefix(prefix);

  const assets: CloudinaryAsset[] = [];
  let cursor = "";

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const body: Record<string, unknown> = { expression, max_results: PAGE_SIZE };
    if (cursor) body.next_cursor = cursor;

    const response = await requestApi("/resources/search", { body }, config, fetchImpl);
    const list = (response.resources || []) as Record<string, unknown>[];
    list.forEach((value) => {
      const asset = toAsset(value);
      if (asset) assets.push(asset);
    });

    const next = response.next_cursor;
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
    const query: Record<string, string | number> = { max_results: PAGE_SIZE };
    if (cursor) query.next_cursor = cursor;

    const body = await requestApi(
      `/folders/${encodeURIComponent(cleanPrefix)}`,
      { query },
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

// Telusuri folder sampai `maxDepth` tingkat (default 2: `laptop/<brand>/<folder>`).
// Penelusuran berhenti bila satu tingkat berisi terlalu banyak folder, supaya
// tidak berubah jadi ratusan request.
export async function listDescendantFolders(
  prefix: string,
  options?: { config?: CloudinaryAdminConfig; fetchImpl?: FetchLike; maxDepth?: number }
): Promise<string[]> {
  const maxDepth = options?.maxDepth ?? 2;
  const cleanPrefix = (prefix || "").replace(/^\/+|\/+$/g, "");

  const found: string[] = [];
  let level: string[] = cleanPrefix ? [cleanPrefix] : [];

  for (let depth = 0; depth < maxDepth && level.length > 0; depth += 1) {
    if (level.length > MAX_DESCEND_BREADTH) break;
    const next: string[] = [];
    for (const path of level) {
      const children = await listChildFolders(path, options);
      children.forEach((child) => {
        found.push(child);
        next.push(child);
      });
    }
    level = next;
  }

  return found;
}
