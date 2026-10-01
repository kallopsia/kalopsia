import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { photoStats } from "@/lib/admin-photos";
import { photoMappingRowsForAdmin } from "@/lib/admin-photo-mapping";
import { CLOUDINARY_FOLDER_PREFIX, excludedBrandSummary } from "@/lib/photo-config";
import PhotoMappingPanel from "@/components/admin/PhotoMappingPanel";
import PhotoSyncPanel from "@/components/admin/PhotoSyncPanel";
import { cardClass } from "@/components/admin/styles";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin // Sinkron Foto — KALOPSIA TECH" };

function formatDate(value: string | null): string {
  if (!value) return "belum pernah";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminPhotosPage() {
  await requireAdmin();

  let stats: Awaited<ReturnType<typeof photoStats>> | null = null;
  let mapping: Awaited<ReturnType<typeof photoMappingRowsForAdmin>> | null = null;
  let error = "";

  try {
    stats = await photoStats();
    mapping = await photoMappingRowsForAdmin();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <div className="w-full">
      <div className="mb-[16px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
          ADMIN // SINKRON FOTO
        </div>
        <h1 className="text-[24px] md:text-[32px] font-light leading-tight text-[#0F0E12]">
          foto produk dari cloudinary
        </h1>
        <p className="mt-[8px] max-w-[720px] text-[13px] leading-[1.6] text-[#767676]">
          Foto ditata di Cloudinary per folder, lalu dipetakan ke SKU lewat berkas
          &quot;Pemetaan SKU&quot;. Sinkron hanya menulis tabel <code>product_photos</code> — gambar
          yang diatur manual di <Link href="/admin/products" className="text-[#0071BB] hover-underline-anim">halaman produk</Link>{" "}
          tidak pernah disentuh. Brand yang sudah tidak dijual diabaikan: {excludedBrandSummary()}.
        </p>
      </div>

      {error && (
        <div className="border border-[#B00020] bg-[#FFFFFF] p-[16px] mb-[16px] text-[12px] leading-[1.6] text-[#B00020]">
          Tidak bisa membaca data foto: {error}
          <div className="mt-[8px] text-[#767676]">
            Jalankan migrasi <code>supabase/migrations/20261007000000_product_photos.sql</code>{" "}
            terlebih dulu.
          </div>
        </div>
      )}

      {stats && mapping && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-[1px] bg-[#D6D6D6] border border-[#D6D6D6] mb-[24px]">
          {[
            { label: "SKU terpemetaan", value: mapping.stored },
            { label: "Folder unik", value: mapping.folders },
            { label: "Override manual", value: mapping.manual },
            { label: "SKU punya foto", value: stats.skusWithPhotos },
            { label: "Baris foto", value: stats.syncRows + stats.manualRows },
            { label: "SKU tanpa foto", value: stats.skusWithoutAnyPhoto },
          ].map((item) => (
            <div key={item.label} className={`${cardClass} p-[12px]`}>
              <div className="text-[10px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
                {item.label}
              </div>
              <div className="text-[20px] tabular-nums text-[#0F0E12]">{item.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-[24px] text-[12px] text-[#767676]">
        Sinkron terakhir: {formatDate(stats?.lastSyncedAt ?? null)} · foto hasil sinkron{" "}
        {stats?.syncRows ?? 0} baris · foto manual {stats?.manualRows ?? 0} baris
      </div>

      <div className="flex flex-col gap-[24px]">
        <PhotoMappingPanel prefix={CLOUDINARY_FOLDER_PREFIX} initial={mapping} />
        <PhotoSyncPanel defaultPrefix={CLOUDINARY_FOLDER_PREFIX} />
      </div>
    </div>
  );
}
