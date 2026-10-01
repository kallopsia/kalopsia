// Pembaca berkas pemetaan SKU → folder foto Cloudinary.
// Sumber kebenaran: sheet "Pemetaan SKU" (kolom A KODEBARANG, kolom B Nama Folder).
// Pemetaan tidak pernah ditebak dari kode barang maupun nama produk.

import * as XLSX from "xlsx";
import type { PhotoMappingInput } from "./photo-mapping";

export const PHOTO_MAPPING_SHEET = "PEMETAAN SKU";
export const KODEBARANG_HEADER = "KODEBARANG";

const FOLDER_HEADER_RE = /^(NAMA[\s_]*FOLDER|FOLDER[\s_]*CLOUDINARY|FOLDER|URL[\s_]*FOTO|URL|LINK[\s_]*FOTO)$/i;

export class PhotoMappingParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoMappingParseError";
  }
}

export type ParsedPhotoMapping = {
  sheetName: string;
  inputs: PhotoMappingInput[];
  warnings: string[];
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}

function textCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  return String(value).trim();
}

// "…/image/upload/laptop/PR-LAP-AC-X/1.jpg" → "laptop/PR-LAP-AC-X"
// Dipakai untuk CSV yang berisi URL lengkap, bukan nama folder.
export function folderFromPhotoUrl(value: string): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  const withoutQuery = raw.split(/[?#]/)[0].replace(/\/+$/, "");
  const segments = withoutQuery.split("/").filter(Boolean);
  if (segments.length === 0) return "";

  const last = segments[segments.length - 1];
  const looksLikeFile = /\.[A-Za-z0-9]{2,5}$/.test(last);
  const folderSegments = looksLikeFile ? segments.slice(0, -1) : segments;

  // Buang host + path Cloudinary (…/image/upload/v170…/f_auto,q_auto/…).
  let startIndex = folderSegments.findIndex((segment) => /^upload$/i.test(segment));
  if (startIndex === -1) startIndex = folderSegments.findIndex((segment) => /^image$/i.test(segment));
  const kept = startIndex === -1 ? folderSegments : folderSegments.slice(startIndex + 1);

  return kept
    .filter((segment) => !/^v\d+$/i.test(segment) && !/,|=$/.test(segment))
    .join("/");
}

function isPhotoUrlValue(value: string): boolean {
  return /^(https?:)?\/\//i.test(value) || /\/[A-Za-z0-9_.-]+\.[A-Za-z0-9]{2,5}$/i.test(value);
}

// Kolom folder sheet berisi nama folder, tapi admin boleh menempel URL foto.
export function folderCellToFolder(value: string): string {
  const raw = (value || "").trim();
  if (!raw) return "";
  return isPhotoUrlValue(raw) ? folderFromPhotoUrl(raw) : raw;
}

function locateHeader(matrix: unknown[][]): { headerIndex: number; kodeColumn: number; folderColumn: number } | null {
  for (let i = 0; i < matrix.length; i += 1) {
    const row = (matrix[i] || []).map(normalizeHeader);
    const kodeColumn = row.indexOf(KODEBARANG_HEADER);
    if (kodeColumn === -1) continue;
    const folderColumn = row.findIndex((label) => label && FOLDER_HEADER_RE.test(label));
    return {
      headerIndex: i,
      kodeColumn,
      // Tanpa kolom folder yang jelas: kolom tepat di sebelah KODEBARANG.
      folderColumn: folderColumn === -1 ? kodeColumn + 1 : folderColumn,
    };
  }
  return null;
}

function readSheet(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  });
}

function matrixToMapping(
  matrix: unknown[][],
  sheetName: string,
  warnings: string[]
): PhotoMappingInput[] {
  const located = locateHeader(matrix);
  if (!located) {
    throw new PhotoMappingParseError(
      `Kolom "${KODEBARANG_HEADER}" tidak ditemukan di sheet "${sheetName}".`
    );
  }
  const { headerIndex, kodeColumn, folderColumn } = located;
  const folderHeader = normalizeHeader((matrix[headerIndex] || [])[folderColumn] ?? "");
  if (!folderHeader) {
    warnings.push(
      `Sheet "${sheetName}" tidak punya header kolom folder; kolom di sebelah ${KODEBARANG_HEADER} dipakai.`
    );
  } else if (!FOLDER_HEADER_RE.test(folderHeader)) {
    warnings.push(
      `Sheet "${sheetName}": kolom "${folderHeader}" dipakai sebagai nama folder (kolom setelah ${KODEBARANG_HEADER}).`
    );
  }

  const inputs: PhotoMappingInput[] = [];
  for (let i = headerIndex + 1; i < matrix.length; i += 1) {
    const row = matrix[i] || [];
    const kodeBarang = textCell(row[kodeColumn]);
    const folder = folderCellToFolder(textCell(row[folderColumn]));
    if (!kodeBarang && !folder) continue;
    inputs.push({ rowNumber: i + 1, kode_barang: kodeBarang, folder });
  }
  return inputs;
}

export function parsePhotoMappingWorkbook(data: ArrayBuffer | Uint8Array): ParsedPhotoMapping {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(data, { type: "array" });
  } catch {
    throw new PhotoMappingParseError("File tidak bisa dibaca. Pastikan formatnya .xlsx yang valid.");
  }

  const warnings: string[] = [];
  const exact = workbook.SheetNames.find((name) => name.trim().toUpperCase() === PHOTO_MAPPING_SHEET);
  const candidates = exact ? [exact] : workbook.SheetNames;

  if (!exact) {
    warnings.push(
      `Sheet "${PHOTO_MAPPING_SHEET}" tidak ditemukan; mencoba sheet lain yang punya kolom ${KODEBARANG_HEADER}. Sheet tersedia: ${workbook.SheetNames.join(", ") || "(kosong)"}.`
    );
  }

  let lastError: PhotoMappingParseError | null = null;
  for (const name of candidates) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    try {
      const inputs = matrixToMapping(readSheet(sheet), name, warnings);
      if (inputs.length === 0) {
        lastError = new PhotoMappingParseError(`Sheet "${name}" tidak berisi baris pemetaan.`);
        continue;
      }
      return { sheetName: name, inputs, warnings };
    } catch (error) {
      lastError =
        error instanceof PhotoMappingParseError
          ? error
          : new PhotoMappingParseError(`Sheet "${name}" gagal dibaca: ${String(error)}`);
    }
  }

  throw (
    lastError ||
    new PhotoMappingParseError(
      `Tidak ada sheet dengan kolom ${KODEBARANG_HEADER}. Sheet tersedia: ${workbook.SheetNames.join(", ") || "(kosong)"}.`
    )
  );
}

// Cadangan untuk foto di luar struktur folder: CSV "kodebarang,url_foto".
export function parsePhotoMappingCsv(text: string): ParsedPhotoMapping {
  const lines = (text || "").split(/\r?\n/);
  const nonEmpty = lines.filter((line) => line.trim() !== "");
  if (nonEmpty.length === 0) throw new PhotoMappingParseError("Berkas CSV kosong.");

  const separator = nonEmpty[0].includes(";") && !nonEmpty[0].includes(",") ? ";" : ",";
  const header = nonEmpty[0].split(separator).map(normalizeHeader);
  const kodeIndex = header.indexOf(KODEBARANG_HEADER);
  const urlIndex = header.findIndex((label) => FOLDER_HEADER_RE.test(label));

  if (kodeIndex === -1 || urlIndex === -1) {
    throw new PhotoMappingParseError(
      `Header CSV harus memuat ${KODEBARANG_HEADER} dan url_foto. Terbaca: ${header.join(separator)}`
    );
  }

  const inputs: PhotoMappingInput[] = [];
  for (let i = 1; i < nonEmpty.length; i += 1) {
    const cells = nonEmpty[i].split(separator);
    const kodeBarang = textCell(cells[kodeIndex]);
    const urlFoto = textCell(cells[urlIndex]);
    if (!kodeBarang && !urlFoto) continue;
    inputs.push({ rowNumber: i + 1, kode_barang: kodeBarang, folder: folderFromPhotoUrl(urlFoto) });
  }

  return { sheetName: "CSV", inputs, warnings: [] };
}

export function parsePhotoMappingFile(
  data: ArrayBuffer | Uint8Array,
  filename: string
): ParsedPhotoMapping {
  const name = (filename || "").toLowerCase();
  if (name.endsWith(".csv")) {
    const decoder = new TextDecoder("utf-8");
    return parsePhotoMappingCsv(decoder.decode(data));
  }
  return parsePhotoMappingWorkbook(data);
}
