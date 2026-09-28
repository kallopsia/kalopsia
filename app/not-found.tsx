import Link from "next/link";

export default function NotFound() {
  return (
    <div className="w-full flex-1 min-h-[60vh] flex items-center justify-center bg-[#F5F5F5] py-[96px]">
      <div className="max-w-[1040px] mx-auto px-[24px] md:px-[64px] text-center">
        <div className="border border-[#D6D6D6] bg-[#FFFFFF] p-[40px] md:p-[64px] max-w-[540px] mx-auto">
          <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[16px]">
            ERROR 404 // UNIT TIDAK DITEMUKAN
          </div>
          <h1 className="text-[24px] md:text-[32px] font-light text-[#0F0E12] mb-[16px]">
            Halaman Tidak Tersedia
          </h1>
          <p className="text-[14px] leading-[1.6] text-[#767676] mb-[24px]">
            Produk atau halaman yang Anda cari mungkin telah diarsipkan atau dipindahkan ke inventaris lain.
          </p>
          <Link
            href="/"
            className="inline-block px-[24px] py-[12px] bg-[#0F0E12] text-[#E5E5E5] text-[11px] uppercase tracking-[0.08em] border border-[#0F0E12]"
          >
            KEMBALI KE KATALOG UTAMA
          </Link>
        </div>
      </div>
    </div>
  );
}
