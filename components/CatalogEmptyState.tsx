import type { CatalogStatus } from "@/lib/products";

const STATUS_MESSAGE: Record<CatalogStatus, string> = {
  ok: "",
  empty: "Belum ada satupun produk aktif di database.",
  unconfigured: "Koneksi Supabase belum dikonfigurasi, sehingga katalog tidak dapat dibaca.",
  error: "Database tidak terbaca. Periksa konfigurasi Supabase dan log server.",
};

interface CatalogEmptyStateProps {
  status: CatalogStatus;
}

export default function CatalogEmptyState({ status }: CatalogEmptyStateProps) {
  return (
    <div className="w-full border border-[#D6D6D6] bg-[#FFFFFF] p-[24px] md:p-[40px]">
      <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[8px]">
        KATALOG KOSONG
      </div>
      <div className="text-[18px] md:text-[24px] font-light text-[#0F0E12] mb-[16px]">
        {STATUS_MESSAGE[status]}
      </div>
      <p className="text-[14px] leading-[1.6] text-[#767676]">
        Isi katalog lewat <span className="text-[#0F0E12]">npm run db:seed</span> atau unggah
        file Excel dari halaman admin (<span className="text-[#0F0E12]">/admin/import</span>).
        Tidak ada produk contoh yang ditampilkan, supaya kondisi database selalu terlihat
        apa adanya.
      </p>
    </div>
  );
}
