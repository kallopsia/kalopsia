import * as XLSX from "xlsx";
import { z } from "zod";
import { stripKodePrefix } from "./kode-barang";

export const LAPTOP_SHEET_NAME = "LAPTOP";

// Kolom yang wajib ada di baris header.
export const REQUIRED_COLUMNS = ["KODEBARANG", "SPESIFIKASI", "SRP"] as const;
// Kolom opsional: bila tidak ada, nilainya null.
export const OPTIONAL_COLUMNS = ["NOTES"] as const;
// Kolom M1 dan M1 vs LAMA sengaja diabaikan total: tidak pernah disimpan maupun ditampilkan.
export const IGNORED_COLUMNS = ["M1", "M1 vs LAMA"] as const;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export class XlsxParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XlsxParseError";
  }
}

export type ImportRow = {
  rowNumber: number;
  kode_barang: string;
  spesifikasi: string;
  notes: string | null;
  srp: number;
};

export type ImportError = {
  rowNumber: number | null;
  message: string;
};

export type ParseResult = {
  sheetName: string;
  rows: ImportRow[];
  errors: ImportError[];
  warnings: string[];
  dataRowCount: number;
};

const rowSchema = z.object({
  kode_barang: z.string().trim().min(1, "KODEBARANG kosong"),
  spesifikasi: z.string().trim().min(1, "SPESIFIKASI kosong"),
  notes: z.string().trim().nullable().optional(),
  srp: z.number().int().min(0),
});

function normalizeHeader(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

// SRP dalam satuan ribu rupiah. Teks "17,999" / "Rp 17.999" / 17999 → 17999.
export function parseSrp(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
  }
  if (value === null || value === undefined) return 0;
  const text = String(value).trim();
  if (text === "") return 0;
  const digits = text.replace(/[^0-9]/g, "");
  if (digits === "") return 0;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

function textOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return String(value);
  const text = String(value).trim();
  return text === "" ? null : text;
}

function findLaptopSheet(workbook: XLSX.WorkBook): { name: string; sheet: XLSX.WorkSheet } {
  const name = workbook.SheetNames.find((n) => n.trim().toUpperCase() === LAPTOP_SHEET_NAME);
  if (!name) {
    throw new XlsxParseError(
      `Sheet "${LAPTOP_SHEET_NAME}" tidak ditemukan. Sheet yang ada di file: ${workbook.SheetNames.join(
        ", "
      ) || "(kosong)"}.`
    );
  }
  const sheet = workbook.Sheets[name];
  if (!sheet) throw new XlsxParseError(`Sheet "${name}" tidak bisa dibaca.`);
  return { name, sheet };
}

export function parseLaptopWorkbook(data: ArrayBuffer | Uint8Array): ParseResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(data, { type: "array" });
  } catch {
    throw new XlsxParseError("File tidak bisa dibaca. Pastikan formatnya .xlsx yang valid.");
  }

  const { name: sheetName, sheet } = findLaptopSheet(workbook);
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  });

  const headerIndex = matrix.findIndex((row) =>
    (row || []).some((cell) => normalizeHeader(cell) === "KODEBARANG")
  );
  if (headerIndex === -1) {
    throw new XlsxParseError(
      `Baris header tidak ditemukan di sheet "${sheetName}". Header wajib berisi: ${REQUIRED_COLUMNS.join(
        ", "
      )}.`
    );
  }

  const header = (matrix[headerIndex] || []).map(normalizeHeader);
  const columnIndex: Record<string, number> = {};
  header.forEach((label, index) => {
    if (label && !(label in columnIndex)) columnIndex[label] = index;
  });

  const warnings: string[] = [];
  const missingRequired = REQUIRED_COLUMNS.filter(
    (column) => columnIndex[normalizeHeader(column)] === undefined
  );
  if (missingRequired.length > 0) {
    throw new XlsxParseError(
      `Kolom wajib tidak ada di sheet "${sheetName}": ${missingRequired.join(", ")}.`
    );
  }
  OPTIONAL_COLUMNS.forEach((column) => {
    if (columnIndex[normalizeHeader(column)] === undefined) {
      warnings.push(`Kolom "${column}" tidak ditemukan, nilainya dianggap kosong.`);
    }
  });

  const cell = (row: unknown[], column: string): unknown => {
    const index = columnIndex[normalizeHeader(column)];
    if (index === undefined) return null;
    return row[index];
  };

  const rows: ImportRow[] = [];
  const errors: ImportError[] = [];
  const seenKode = new Map<string, number>();
  let dataRowCount = 0;

  for (let i = headerIndex + 1; i < matrix.length; i += 1) {
    const raw = matrix[i] || [];
    if (!raw.some((value) => textOrNull(value) !== null)) continue;
    dataRowCount += 1;
    const rowNumber = i + 1;

    // Prefix lama PR-LAP-<BRAND>- dibuang saat baca, supaya file price list
    // format lama tetap tersimpan tanpa prefix. Cek duplikat memakai kode hasil strip.
    const kodeBarangRaw = textOrNull(cell(raw, "KODEBARANG"));
    const kodeBarang = kodeBarangRaw ? stripKodePrefix(kodeBarangRaw) : kodeBarangRaw;
    if (kodeBarang) {
      const previous = seenKode.get(kodeBarang);
      if (previous !== undefined) {
        errors.push({
          rowNumber,
          message: `KODEBARANG "${kodeBarang}" duplikat (sudah dipakai di baris ${previous}).`,
        });
        continue;
      }
      seenKode.set(kodeBarang, rowNumber);
    }

    const candidate = {
      kode_barang: kodeBarang ?? "",
      spesifikasi: textOrNull(cell(raw, "SPESIFIKASI")) ?? "",
      notes: textOrNull(cell(raw, "NOTES")),
      srp: parseSrp(cell(raw, "SRP")),
    };

    const parsed = rowSchema.safeParse(candidate);
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join("; ");
      errors.push({ rowNumber, message });
      continue;
    }

    rows.push({ rowNumber, ...parsed.data, notes: parsed.data.notes ?? null });
  }

  return { sheetName, rows, errors, warnings, dataRowCount };
}
