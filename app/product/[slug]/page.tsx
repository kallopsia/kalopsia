import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getProductBySlug,
  getVariantGroup,
  PRODUCTS_REVALIDATE_SECONDS,
} from "@/lib/products";
import { getActiveAddons, resolveAddonsForScreen } from "@/lib/addons";
import { getScreenInfo } from "@/lib/product-screen";
import { formatSrp } from "@/lib/pricing";
import ProductVariantView from "@/components/ProductVariantView";

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

  // Slug anggota varian (bukan perwakilan) → gabungkan ke satu URL grup (308).
  if (product.groupSlug && product.groupSlug !== product.slug) {
    permanentRedirect(`/product/${product.groupSlug}`);
  }

  const variants = (await getVariantGroup(params.slug)) || [product];
  const representative = variants[0];

  const addons = await getActiveAddons();
  // Semua anggota grup berbagi kategori layar (bagian dari kunci grup), jadi
  // harga add-on cukup dihitung sekali dari perwakilan. Label kategori layar
  // tidak pernah dikirim ke client — hanya angka harga.
  const screenInfo = await getScreenInfo(representative.id);
  const resolvedAddons = resolveAddonsForScreen(addons, screenInfo?.kategori ?? "belum");

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="w-full bg-[#FFFFFF] border-b border-[#D6D6D6]">
        <div className="max-w-[1040px] mx-auto px-[16px] md:px-[64px] min-h-[48px] py-[8px] flex flex-wrap items-center justify-between gap-x-[16px] gap-y-[4px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
          <div className="flex items-center gap-[8px] min-w-0">
            <Link href="/shop" className="hover-underline-anim text-[#0F0E12] flex-shrink-0">
              KATALOG
            </Link>
            <span className="hidden sm:inline">/</span>
            <span className="hidden sm:inline">{representative.brand}</span>
            <span>/</span>
            <span className="text-[#0F0E12] truncate max-w-[180px] sm:max-w-[320px] md:max-w-none">
              {representative.kodeBarang}
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
          <ProductVariantView variants={variants} addons={resolvedAddons} />
        </div>
      </section>
    </div>
  );
}
