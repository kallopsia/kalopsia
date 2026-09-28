import { requireAdmin } from "@/lib/auth";
import { getCloudinaryPublicConfig } from "@/lib/cloudinary";
import BulkImageForm from "@/components/admin/BulkImageForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin // Gambar Massal — NOTEBOOK // ARCHIVE" };

export default async function AdminImagesPage() {
  await requireAdmin();
  const config = getCloudinaryPublicConfig();

  return (
    <div className="w-full max-w-[880px]">
      <div className="mb-[16px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
          ADMIN // GAMBAR MASSAL
        </div>
        <h1 className="text-[24px] md:text-[32px] font-light leading-tight text-[#0F0E12]">
          tempel url cloudinary lewat csv
        </h1>
        <p className="mt-[8px] text-[13px] leading-[1.6] text-[#767676]">
          Untuk upload satu per satu (termasuk unggah file dari komputer), buka{" "}
          <span className="text-[#0F0E12]">produk → ubah → gambar produk</span>.
          {config.cloudName ? (
            <> Cloud aktif: {config.cloudName}.</>
          ) : (
            <> NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME belum diisi.</>
          )}
        </p>
      </div>

      <BulkImageForm cloudName={config.cloudName} />
    </div>
  );
}
