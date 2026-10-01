import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { PRODUCTS_CACHE_TAG } from "@/lib/supabase/server";
import { applyPhotoSyncPlan, runPhotoSyncDryRun, type PhotoSyncReport } from "@/lib/admin-photos";
import { CLOUDINARY_FOLDER_PREFIX } from "@/lib/photo-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const LIST_LIMIT = 300;

// Laporan dikirim ke browser dalam bentuk terpangkas — cukup untuk diperiksa,
// bukan salinan penuh rencana tulis.
function serialize(report: PhotoSyncReport) {
  return {
    prefix: report.prefix,
    overwrite: report.overwrite,
    warnings: report.warnings,
    summary: report.summary,
    writePlans: report.writePlans.slice(0, LIST_LIMIT).map((plan) => ({
      kode_barang: plan.kode_barang,
      folder: plan.folder,
      action: plan.action,
      removed: plan.removedPublicIds.length,
      photos: plan.photos.map((photo) => ({
        publicId: photo.publicId,
        fileName: photo.fileName,
        posisi: photo.posisi,
      })),
    })),
    emptyFolders: report.emptyFolders.slice(0, LIST_LIMIT).map((folder) => ({
      folder: folder.folder,
      existsInCloudinary: folder.existsInCloudinary,
      skuCount: folder.skuCount,
    })),
    stalePhotos: report.stalePhotos.slice(0, LIST_LIMIT).map((item) => ({
      kode_barang: item.kode_barang,
      folder: item.folder,
      count: item.publicIds.length,
    })),
    orphanFolders: report.orphanFolders.slice(0, LIST_LIMIT),
    excludedFolders: report.excludedFolders.slice(0, LIST_LIMIT),
    skippedFiles: report.skippedFiles.slice(0, LIST_LIMIT),
    truncatedFiles: report.truncatedFiles.slice(0, LIST_LIMIT),
    listsTrimmed:
      report.writePlans.length > LIST_LIMIT ||
      report.emptyFolders.length > LIST_LIMIT ||
      report.stalePhotos.length > LIST_LIMIT ||
      report.orphanFolders.length > LIST_LIMIT ||
      report.skippedFiles.length > LIST_LIMIT ||
      report.truncatedFiles.length > LIST_LIMIT,
  };
}

// mode 'preview' = dry-run (tidak menulis apa pun). mode 'apply' baru menulis,
// dan selalu menghitung ulang rencana dari kondisi terkini di Cloudinary + DB.
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const mode = body.mode === "apply" ? "apply" : "preview";
  const overwrite = body.overwrite === true;
  const prefixRaw = typeof body.prefix === "string" ? body.prefix.trim() : "";
  const prefix = (prefixRaw || CLOUDINARY_FOLDER_PREFIX).replace(/^\/+|\/+$/g, "");

  try {
    const report = await runPhotoSyncDryRun({ overwrite, prefix });

    if (mode === "preview") {
      return NextResponse.json({ mode, report: serialize(report) });
    }

    if (body.confirm !== true) {
      return NextResponse.json(
        { error: "Simpan hanya berjalan setelah dry-run dikonfirmasi (confirm=true)." },
        { status: 400 }
      );
    }

    const result = await applyPhotoSyncPlan(report);
    revalidateTag(PRODUCTS_CACHE_TAG);
    return NextResponse.json({ mode, report: serialize(report), result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Sinkronisasi foto gagal diproses. Pastikan migrasi 20261007000000 sudah dijalankan.",
      },
      { status: 500 }
    );
  }
}
