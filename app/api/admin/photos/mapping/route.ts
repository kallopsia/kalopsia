import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  PHOTO_MAPPING_MAX_BYTES,
  photoMappingRowsForAdmin,
  previewPhotoMapping,
  savePhotoMapping,
} from "@/lib/admin-photo-mapping";
import type { MappingSource } from "@/types/product-photo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const ACCEPTED_RE = /\.(xlsx|csv)$/i;

// Daftar pemetaan tersimpan untuk halaman admin.
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  try {
    const payload = await photoMappingRowsForAdmin();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membaca pemetaan. Pastikan migrasi 20261007000000 sudah dijalankan.",
      },
      { status: 500 }
    );
  }
}

// Unggah berkas pemetaan: mode 'preview' hanya melaporkan, 'apply' menyimpan.
export async function POST(request: Request) {
  try {
    await requireAdmin();
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

  const mode = form.get("mode") === "apply" ? "apply" : "preview";
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Berkas .xlsx atau .csv tidak ditemukan di permintaan." },
      { status: 400 }
    );
  }
  if (file.size > PHOTO_MAPPING_MAX_BYTES) {
    return NextResponse.json(
      { error: `Ukuran berkas maksimal ${Math.round(PHOTO_MAPPING_MAX_BYTES / 1024 / 1024)} MB.` },
      { status: 413 }
    );
  }
  if (!ACCEPTED_RE.test(file.name)) {
    return NextResponse.json(
      { error: "Format harus .xlsx (sheet \"Pemetaan SKU\") atau .csv (kodebarang,url_foto)." },
      { status: 415 }
    );
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const source: MappingSource = /\.csv$/i.test(file.name) ? "csv" : "xlsx";

  try {
    const preview = await previewPhotoMapping(data, file.name);
    if (mode === "preview") {
      return NextResponse.json({ mode, report: preview.report });
    }
    const saved = await savePhotoMapping(preview.rows, source);
    return NextResponse.json({ mode, report: preview.report, saved });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Berkas pemetaan tidak bisa diproses. Jalankan migrasi 20261007000000 bila tabel belum ada.",
      },
      { status: 500 }
    );
  }
}
