import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImportError, ImportRow } from "./xlsx-parser";
import type { ProductRow } from "@/types/product";
import type { ImportLogInsert } from "@/types/import-log";
import { formatSrp } from "./pricing";
import { stripKodePrefix } from "./kode-barang";
import { detectScreenCategory } from "./screen-category";

export type MissingAction = "deactivate" | "keep" | "delete";
export type ChangedField = "kode_barang" | "spesifikasi" | "notes" | "srp";

export type FieldChange = {
  field: ChangedField;
  label: string;
  from: string;
  to: string;
};

export type ChangedRow = {
  row: ImportRow;
  current: ProductRow;
  changes: FieldChange[];
};

export type ImportDiff = {
  added: ImportRow[];
  changed: ChangedRow[];
  missing: ProductRow[];
  errors: ImportError[];
  unchanged: number;
  existingCount: number;
};

export type ApplyResult = {
  added: number;
  changed: number;
  deactivated: number;
  deleted: number;
  errorCount: number;
  errors: ImportError[];
};

export type ApplyOptions = {
  filename: string;
  source: string;
  missingAction: MissingAction;
  actorId?: string | null;
  actorEmail?: string | null;
};

const UPSERT_BATCH = 500;
const MAX_LOGGED_ERRORS = 200;

export const FIELD_LABELS: Record<ChangedField, string> = {
  kode_barang: "Kode barang",
  spesifikasi: "Spesifikasi",
  notes: "Notes",
  srp: "SRP",
};

function text(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function displayChange(field: ChangedField, value: string | number | null): string {
  if (field === "srp") return formatSrp(Number(value) || 0);
  const t = text(value as string | null);
  return t === "" ? "(kosong)" : t;
}

// Kolom yang dikirim saat upsert: image_urls sengaja tidak disertakan agar
// gambar yang sudah dikelola admin tidak pernah tertimpa oleh impor Excel.
type UpsertRow = ImportRow & { id?: string };

function toUpsertPayload(row: UpsertRow) {
  return {
    ...(row.id ? { id: row.id } : {}),
    kode_barang: row.kode_barang,
    spesifikasi: row.spesifikasi,
    notes: row.notes,
    srp: row.srp,
    is_active: true,
  };
}

function diffRow(row: ImportRow, current: ProductRow): FieldChange[] {
  const changes: FieldChange[] = [];
  const push = (field: ChangedField, from: string | number | null, to: string | number | null) => {
    if (text(String(from ?? "")) === text(String(to ?? ""))) return;
    changes.push({
      field,
      label: FIELD_LABELS[field],
      from: displayChange(field, from),
      to: displayChange(field, to),
    });
  };

  // Baris existing yang masih ber-prefix lama ditulis ulang ke kode hasil strip.
  push("kode_barang", current.kode_barang, row.kode_barang);
  push("spesifikasi", current.spesifikasi, row.spesifikasi);
  push("notes", current.notes, row.notes);
  if (Number(current.srp) !== Number(row.srp)) {
    changes.push({
      field: "srp",
      label: FIELD_LABELS.srp,
      from: displayChange("srp", Number(current.srp)),
      to: displayChange("srp", row.srp),
    });
  }

  if (!current.is_active) {
    changes.push({
      field: "spesifikasi",
      label: "Status",
      from: "Nonaktif",
      to: "Aktif",
    });
  }

  return changes;
}

export function computeImportDiff(
  rows: ImportRow[],
  existing: ProductRow[],
  errors: ImportError[]
): ImportDiff {
  const existingByKode = new Map<string, ProductRow>();
  // Dicocokkan lewat kode hasil strip supaya file ber-prefix lama tetap
  // mengenali baris existing yang sudah tanpa prefix (dan sebaliknya).
  existing.forEach((row) => existingByKode.set(stripKodePrefix(row.kode_barang), row));

  const added: ImportRow[] = [];
  const changed: ChangedRow[] = [];
  const seen = new Set<string>();
  let unchanged = 0;

  rows.forEach((row) => {
    seen.add(row.kode_barang);
    const current = existingByKode.get(row.kode_barang);
    if (!current) {
      added.push(row);
      return;
    }
    const changes = diffRow(row, current);
    if (changes.length === 0) {
      unchanged += 1;
      return;
    }
    changed.push({ row, current, changes });
  });

  const missing = existing.filter((row) => !seen.has(stripKodePrefix(row.kode_barang)));

  return {
    added,
    changed,
    missing,
    errors,
    unchanged,
    existingCount: existing.length,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

async function upsertRows(
  supabase: SupabaseClient,
  rows: UpsertRow[],
  errors: ImportError[],
  onConflict: "kode_barang" | "id"
): Promise<number> {
  let saved = 0;
  for (const batch of chunk(rows, UPSERT_BATCH)) {
    const { error } = await supabase
      .from("products")
      .upsert(batch.map(toUpsertPayload), { onConflict });
    if (error) {
      errors.push({
        rowNumber: null,
        message: `Gagal menyimpan ${batch.length} baris: ${error.message}`,
      });
      continue;
    }
    saved += batch.length;
  }
  return saved;
}

// Kategorisasi layar otomatis untuk produk hasil impor. Override manual admin
// tidak pernah ditimpa; kegagalan (mis. tabel belum dimigrasi) tidak
// menghentikan impor.
async function categorizeImportedScreens(
  supabase: SupabaseClient,
  kodeBarangs: string[]
): Promise<void> {
  const kodes = Array.from(new Set(kodeBarangs)).filter(Boolean);
  if (kodes.length === 0) return;
  try {
    const { data: products, error } = await supabase
      .from("products")
      .select("id, spesifikasi")
      .in("kode_barang", kodes);
    if (error || !products || products.length === 0) return;

    const ids = products.map((row) => row.id);
    const { data: existing } = await supabase
      .from("product_screen_info")
      .select("product_id, sumber")
      .in("product_id", ids);
    const manualIds = new Set(
      (existing || []).filter((row) => row.sumber === "manual").map((row) => row.product_id)
    );

    const rows = products
      .filter((row) => !manualIds.has(row.id))
      .map((row) => ({
        product_id: row.id,
        kategori: detectScreenCategory(row.spesifikasi),
        sumber: "auto",
      }));
    if (rows.length === 0) return;

    for (const batch of chunk(rows, UPSERT_BATCH)) {
      await supabase.from("product_screen_info").upsert(batch, { onConflict: "product_id" });
    }
  } catch {
    // Diabaikan: kategori layar bisa diisi lewat tombol "kategorikan ulang".
  }
}

export async function applyImport(
  supabase: SupabaseClient,
  diff: ImportDiff,
  options: ApplyOptions
): Promise<ApplyResult> {
  const errors: ImportError[] = [...diff.errors];

  const added = await upsertRows(supabase, diff.added, errors, "kode_barang");
  // Baris berubah di-upsert lewat id supaya kode barang lama yang masih
  // ber-prefix ikut tertulis ulang tanpa membuat baris kembar.
  const changed = await upsertRows(
    supabase,
    diff.changed.map((item) => ({ ...item.row, id: item.current.id })),
    errors,
    "id"
  );

  await categorizeImportedScreens(
    supabase,
    [...diff.added, ...diff.changed.map((item) => item.row)].map((row) => row.kode_barang)
  );

  // Deteksi warna + pengelompokan varian ulang (best-effort). regroupProducts
  // mendeteksi ulang warna semua produk 'auto' (manual tak ditimpa) lalu
  // menghitung group_slug + duplikat. Kegagalan tidak menghentikan impor.
  try {
    const { regroupProducts } = await import("./product-color");
    await regroupProducts(false);
  } catch {
    // Diabaikan: warna/grup bisa dihitung lewat tombol "kelompokkan ulang".
  }

  let deactivated = 0;
  let deleted = 0;
  const missingIds = diff.missing.map((row) => row.id);

  if (options.missingAction === "deactivate") {
    for (const batch of chunk(missingIds, UPSERT_BATCH)) {
      const { error } = await supabase.from("products").update({ is_active: false }).in("id", batch);
      if (error) {
        errors.push({ rowNumber: null, message: `Gagal menonaktifkan produk: ${error.message}` });
      } else {
        deactivated += batch.length;
      }
    }
  } else if (options.missingAction === "delete") {
    for (const batch of chunk(missingIds, UPSERT_BATCH)) {
      const { error } = await supabase.from("products").delete().in("id", batch);
      if (error) {
        errors.push({ rowNumber: null, message: `Gagal menghapus produk: ${error.message}` });
      } else {
        deleted += batch.length;
      }
    }
  }

  const log: ImportLogInsert = {
    filename: options.filename,
    source: options.source,
    added_count: added,
    changed_count: changed,
    deactivated_count: deactivated,
    deleted_count: deleted,
    error_count: errors.length,
    errors: errors.slice(0, MAX_LOGGED_ERRORS),
    actor_id: options.actorId ?? null,
    actor_email: options.actorEmail ?? null,
  };

  const { error: logError } = await supabase.from("import_logs").insert(log);
  if (logError) {
    errors.push({ rowNumber: null, message: `Gagal menulis import_logs: ${logError.message}` });
  }

  return {
    added,
    changed,
    deactivated,
    deleted,
    errorCount: errors.length,
    errors,
  };
}
