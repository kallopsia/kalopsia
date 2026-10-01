import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductCatalog from "@/components/ProductCatalog";
import CatalogPagination from "@/components/CatalogPagination";
import CatalogEmptyState from "@/components/CatalogEmptyState";
import {
  getProducts,
  getCatalogStatus,
  collectKategori,
  PRODUCTS_REVALIDATE_SECONDS,
} from "@/lib/products";

interface KategoriPageProps {
  params: {
    kategori: string;
  };
  searchParams: { page?: string };
}

export const revalidate = PRODUCTS_REVALIDATE_SECONDS;

const PER_PAGE = 24;

export async function generateStaticParams() {
  const products = await getProducts();
  return collectKategori(products).map((kategori) => ({ kategori }));
}

export async function generateMetadata({ params }: KategoriPageProps): Promise<Metadata> {
  return {
    title: `Katalog ${params.kategori}`,
    description: `Semua unit laptop kategori ${params.kategori} pada inventaris KALOPSIA TECH.`,
  };
}

export default async function KategoriPage({ params, searchParams }: KategoriPageProps) {
  const products = await getProducts();
  const status = await getCatalogStatus();
  const kategori = params.kategori.toLowerCase();
  const allKategori = collectKategori(products);

  if (products.length > 0 && !allKategori.includes(kategori)) notFound();

  const filtered = products.filter((product) => product.kategori.includes(kategori));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const page = Math.min(Math.max(1, Number(searchParams.page) || 1), totalPages);
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="w-full flex-1 bg-[#FFFFFF] md:bg-[#F5F5F5]">
      <section className="max-w-[1280px] mx-auto px-[16px] md:px-[32px] pt-[24px] md:pt-[40px] pb-[16px] md:pb-[24px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
          KATALOG // KATEGORI
        </div>
        <h1 className="text-[24px] md:text-[32px] font-light leading-tight text-[#0F0E12] tracking-tight">
          {kategori}
        </h1>
        <div className="mt-[12px] flex flex-wrap items-center gap-x-[16px] gap-y-[4px] text-[11px] uppercase tracking-[0.08em]">
          <Link href="/shop" className="hover-underline-anim text-[#0071BB]">
            semua laptop
          </Link>
          {allKategori.map((item) => (
            <Link
              key={item}
              href={`/katalog/${item}`}
              className={
                item === kategori
                  ? "text-[#0F0E12]"
                  : "text-[#767676] hover:text-[#0F0E12] transition-colors"
              }
            >
              {item}
            </Link>
          ))}
        </div>
      </section>

      <section className="w-full px-[16px] pb-[24px] md:px-0 md:pb-0">
        {products.length === 0 ? (
          <div className="max-w-[1280px] mx-auto md:px-[32px]">
            <CatalogEmptyState status={status} />
          </div>
        ) : (
          <ProductCatalog products={pageItems} />
        )}
      </section>

      {products.length > 0 && (
        <CatalogPagination page={page} totalPages={totalPages} basePath={`/katalog/${kategori}`} />
      )}
    </div>
  );
}
