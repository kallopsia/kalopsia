import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getProductBySlug, PRODUCTS_REVALIDATE_SECONDS } from "@/lib/products";
import { formatSrp } from "@/lib/pricing";
import ProductGallery from "@/components/ProductGallery";
import ProductPurchaseSection from "@/components/ProductPurchaseSection";
import ProductSpecificationsAccordion from "@/components/ProductSpecificationsAccordion";

interface ProductPageProps {
  params: {
    slug: string;
  };
}

export const revalidate = PRODUCTS_REVALIDATE_SECONDS;

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) {
    return { title: "Produk Tidak Ditemukan — KALOPSIA TECH" };
  }

  return {
    title: `${product.nama} (${formatSrp(product.srp)}) — KALOPSIA TECH`,
    description: `${product.brand} ${product.nama}. Spesifikasi: ${product.spesifikasiText}. Pesan lewat WhatsApp.`,
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="w-full bg-[#FFFFFF] border-b border-[#D6D6D6]">
        <div className="max-w-[1040px] mx-auto px-[16px] md:px-[64px] min-h-[48px] py-[8px] flex flex-wrap items-center justify-between gap-x-[16px] gap-y-[4px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
          <div className="flex items-center gap-[8px] min-w-0">
            <Link href="/shop" className="hover-underline-anim text-[#0F0E12] flex-shrink-0">
              KATALOG
            </Link>
            <span className="hidden sm:inline">/</span>
            <span className="hidden sm:inline">{product.brand}</span>
            <span>/</span>
            <span className="text-[#0F0E12] truncate max-w-[180px] sm:max-w-[320px] md:max-w-none">
              {product.kodeBarang}
            </span>
          </div>
          <span className="hidden sm:inline-block">
            <Link href="/shop" className="hover-underline-anim text-[#0F0E12]">
              KEMBALI KE LISTING
            </Link>
          </span>
        </div>
      </div>

      <section className="w-full flex-1 bg-[#F5F5F5] pt-[24px] md:pt-[64px] pb-[48px] md:pb-[96px]">
        <div className="max-w-[1040px] mx-auto px-[16px] md:px-[64px]">
          <div className="grid grid-cols-1 gap-[24px] md:grid-cols-2 md:gap-[40px] items-start mb-[48px] md:mb-[96px]">
            <div>
              <ProductGallery images={product.gambar} productName={product.nama} />
            </div>
            <div>
              <ProductPurchaseSection product={product} />
            </div>
          </div>

          <div className="w-full pt-[32px] md:pt-[40px] border-t border-[#D6D6D6]">
            <div className="mb-[24px]">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
                AUDIT HARDWARE LENGKAP
              </div>
              <h2 className="text-[24px] md:text-[32px] font-light text-[#0F0E12] tracking-tight">
                Spesifikasi Teknis
              </h2>
            </div>

            <ProductSpecificationsAccordion
              spesifikasiText={product.spesifikasiText}
              ringkasan={product.spesifikasi}
              notes={product.catatan}
              kodeBarang={product.kodeBarang}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
