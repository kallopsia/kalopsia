import type { Metadata } from "next";
import ProductCatalog from "@/components/ProductCatalog";
import CatalogToolbar from "@/components/CatalogToolbar";
import CatalogPagination from "@/components/CatalogPagination";
import CatalogEmptyState from "@/components/CatalogEmptyState";
import { getProducts, getCatalogStatus, PRODUCTS_REVALIDATE_SECONDS } from "@/lib/products";

export const revalidate = PRODUCTS_REVALIDATE_SECONDS;

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Katalog laptop lengkap dari Acer, ASUS, Lenovo, Apple, HP, Dell, MSI, dan lainnya. Pesan lewat WhatsApp.",
};

const PER_PAGE = 24;

interface ShopPageProps {
  searchParams: { q?: string; brand?: string; page?: string };
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const products = await getProducts();
  const status = await getCatalogStatus();

  const query = (searchParams.q || "").trim();
  const brand = (searchParams.brand || "").trim();
  const needle = query.toLowerCase();

  const filtered = products.filter((product) => {
    if (brand && product.brand !== brand) return false;
    if (!needle) return true;
    return `${product.nama} ${product.kodeBarang} ${product.spesifikasiText}`
      .toLowerCase()
      .includes(needle);
  });

  const brands = Array.from(new Set(products.map((product) => product.brand))).sort();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const requestedPage = Number(searchParams.page) || 1;
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="w-full flex-1 bg-[#FFFFFF] md:bg-[#F5F5F5]">
      {products.length === 0 ? (
        <section className="max-w-[1280px] mx-auto w-full px-[16px] md:px-[32px] pt-[24px] md:pt-[40px] pb-[24px]">
          <CatalogEmptyState status={status} />
        </section>
      ) : (
        <>
          <CatalogToolbar
            query={query}
            brand={brand}
            brands={brands}
            total={products.length}
            shown={filtered.length}
            basePath="/shop"
          />

          <section className="w-full px-[16px] pb-[24px] md:px-0 md:pb-0">
            <ProductCatalog products={pageItems} />
          </section>

          <CatalogPagination
            page={page}
            totalPages={totalPages}
            basePath="/shop"
            params={{ q: query, brand }}
          />
        </>
      )}
    </div>
  );
}
