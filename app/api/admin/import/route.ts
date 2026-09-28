import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import type { User } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  MAX_UPLOAD_BYTES,
  parseLaptopWorkbook,
  XlsxParseError,
} from "@/lib/xlsx-parser";
import { applyImport, computeImportDiff, type ImportDiff } from "@/lib/import";
import { PRODUCTS_CACHE_TAG } from "@/lib/supabase/server";
import type { ProductRow } from "@/types/product";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const modeSchema = z.enum(["preview", "apply"]);
const missingSchema = z.enum(["deactivate", "keep", "delete"]);

const PREVIEW_TEXT_LIMIT = 160;

function clip(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  return text.length > PREVIEW_TEXT_LIMIT ? `${text.slice(0, PREVIEW_TEXT_LIMIT)}…` : text;
}

function serializeDiff(diff: ImportDiff) {
  return {
    added: diff.added.map((row) => ({
      rowNumber: row.rowNumber,
      kode_barang: row.kode_barang,
      spesifikasi: clip(row.spesifikasi),
      notes: clip(row.notes),
      srp: row.srp,
    })),
    changed: diff.changed.map((item) => ({
      rowNumber: item.row.rowNumber,
      kode_barang: item.row.kode_barang,
      changes: item.changes,
    })),
    missing: diff.missing.map((row) => ({
      id: row.id,
      kode_barang: row.kode_barang,
      spesifikasi: clip(row.spesifikasi),
      is_active: row.is_active,
      has_image: (row.image_urls || []).length > 0,
    })),
    errors: diff.errors,
    unchanged: diff.unchanged,
    existingCount: diff.existingCount,
  };
}

export async function POST(request: Request) {
  let user: User;
  try {
    user = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Body harus berupa multipart/form-data berisi field 'file'." },
      { status: 400 }
    );
  }

  const modeParsed = modeSchema.safeParse(form.get("mode") || "preview");
  if (!modeParsed.success) {
    return NextResponse.json(
      { error: "Parameter mode harus 'preview' atau 'apply'." },
      { status: 400 }
    );
  }
  const missingParsed = missingSchema.safeParse(form.get("missingAction") || "deactivate");
  if (!missingParsed.success) {
    return NextResponse.json(
      { error: "missingAction harus 'deactivate', 'keep', atau 'delete'." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "File .xlsx tidak ditemukan di permintaan." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Ukuran file maksimal ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.` },
      { status: 413 }
    );
  }
  if (!/\.xlsx$/i.test(file.name)) {
    return NextResponse.json(
      { error: "Format file harus .xlsx. File .xls lama perlu di-save-as .xlsx terlebih dulu." },
      { status: 415 }
    );
  }

  let parsed;
  try {
    parsed = parseLaptopWorkbook(new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    if (error instanceof XlsxParseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "File Excel tidak bisa diproses." }, { status: 500 });
  }

  const supabase = getSupabaseServiceClient();
  const { data: existing, error: existingError } = await supabase
    .from("products")
    .select("id,kode_barang,spesifikasi,notes,srp,image_urls,is_active");
  if (existingError) {
    return NextResponse.json(
      { error: `Gagal membaca produk dari database: ${existingError.message}` },
      { status: 500 }
    );
  }

  const diff = computeImportDiff(parsed.rows, (existing || []) as ProductRow[], parsed.errors);

  const summary = {
    filename: file.name,
    sheetName: parsed.sheetName,
    dataRowCount: parsed.dataRowCount,
    validRows: parsed.rows.length,
    added: diff.added.length,
    changed: diff.changed.length,
    missing: diff.missing.length,
    unchanged: diff.unchanged,
    errors: diff.errors.length,
    warnings: parsed.warnings,
  };

  if (modeParsed.data === "preview") {
    return NextResponse.json({ mode: "preview", summary, diff: serializeDiff(diff) });
  }

  const result = await applyImport(supabase, diff, {
    filename: file.name,
    source: "admin",
    missingAction: missingParsed.data,
    actorId: user.id,
    actorEmail: user.email ?? null,
  });

  revalidateTag(PRODUCTS_CACHE_TAG);

  return NextResponse.json({
    mode: "apply",
    summary,
    result: {
      added: result.added,
      changed: result.changed,
      deactivated: result.deactivated,
      deleted: result.deleted,
      errorCount: result.errorCount,
      errors: result.errors.slice(0, 50),
    },
  });
}
