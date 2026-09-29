import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductGallery from "@/components/ProductGallery";
import { getSoftwareBySlug } from "@/lib/services";
import { PRODUCTS_REVALIDATE_SECONDS } from "@/lib/supabase/server";
import { formatServicePrice } from "@/lib/pricing";

interface SoftwareDetailPageProps {
  params: { slug: string };
}

export const revalidate = PRODUCTS_REVALIDATE_SECONDS;

export async function generateMetadata({ params }: SoftwareDetailPageProps): Promise<Metadata> {
  const software = await getSoftwareBySlug(params.slug);
  if (!software) return { title: "Software Tidak Ditemukan — KALOPSIA TECH" };
  return {
    title: `Install ${software.nama} (${formatServicePrice(software.harga)}) — KALOPSIA TECH`,
    description: `Jasa install ${software.nama}. Biaya install ${formatServicePrice(
      software.harga
    )}. Pesan lewat WhatsApp.`,
  };
}

export default async function SoftwareDetailPage({ params }: SoftwareDetailPageProps) {
  const software = await getSoftwareBySlug(params.slug);
  if (!software) notFound();

  const waUrl = `/api/wa?software=${encodeURIComponent(software.slug)}`;
  const images = software.image_url ? [software.image_url] : [];

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="w-full bg-[#FFFFFF] border-b border-[#D6D6D6]">
        <div className="max-w-[1040px] mx-auto px-[16px] md:px-[64px] min-h-[48px] py-[8px] flex flex-wrap items-center justify-between gap-x-[16px] gap-y-[4px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
          <div className="flex items-center gap-[8px] min-w-0">
            <Link
              href="/lainnya/install-software"
              className="hover-underline-anim text-[#0F0E12] flex-shrink-0"
            >
              INSTALL SOFTWARE
            </Link>
            <span>/</span>
            <span className="text-[#0F0E12] truncate max-w-[180px] sm:max-w-[320px] md:max-w-none">
              {software.nama}
            </span>
          </div>
          <span className="hidden sm:inline-block">
            <Link href="/lainnya/install-software" className="hover-underline-anim text-[#0F0E12]">
              KEMBALI KE DAFTAR
            </Link>
          </span>
        </div>
      </div>

      <section className="w-full flex-1 bg-[#F5F5F5] pt-[24px] md:pt-[64px] pb-[48px] md:pb-[96px]">
        <div className="max-w-[1040px] mx-auto px-[16px] md:px-[64px]">
          <div className="grid grid-cols-1 gap-[24px] md:grid-cols-2 md:gap-[40px] items-start">
            <ProductGallery images={images} productName={software.nama} />

            <div className="w-full border border-[#D6D6D6] bg-[#FFFFFF] p-[16px] sm:p-[24px] md:p-[40px]">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[16px] pb-[8px] border-b border-[#D6D6D6]">
                JASA INSTALL SOFTWARE
              </div>

              <h1 className="text-[20px] sm:text-[24px] md:text-[28px] font-light leading-[1.25] text-[#0F0E12] mb-[24px] break-words">
                {software.nama}
              </h1>

              <div className="mb-[24px] pb-[16px] border-b border-[#D6D6D6]">
                <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
                  BIAYA INSTALL
                </div>
                <div className="text-[24px] font-normal tabular-nums text-[#0F0E12]">
                  {formatServicePrice(software.harga)}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
                  SPESIFIKASI MINIMUM
                </div>
                {software.spesifikasi_minimum ? (
                  <p className="text-[14px] leading-[1.7] whitespace-pre-line text-[#0F0E12] break-words">
                    {software.spesifikasi_minimum}
                  </p>
                ) : (
                  <p className="text-[13px] leading-[1.6] text-[#767676]">
                    Belum dicantumkan. Tanyakan lewat WhatsApp apakah unit kamu sudah cukup untuk
                    software ini.
                  </p>
                )}
              </div>

              <div className="mt-[24px] pt-[24px] border-t border-[#D6D6D6]">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-wa block w-full py-[16px] px-[24px] text-center text-[14px] uppercase tracking-[0.08em] select-none"
                >
                  pesan sekarang
                </a>
                <div className="mt-[16px] text-[11px] uppercase tracking-[0.08em] text-[#767676] text-center">
                  pesan otomatis: nama software + biaya install
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
