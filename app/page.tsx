import type { Metadata } from "next";
import ProductCatalog from "@/components/ProductCatalog";
import CatalogToolbar from "@/components/CatalogToolbar";
import CatalogPagination from "@/components/CatalogPagination";
import { getProducts, PRODUCTS_REVALIDATE_SECONDS } from "@/lib/products";

export const revalidate = PRODUCTS_REVALIDATE_SECONDS;

export const metadata: Metadata = {
  title: "NOTEBOOK // ARCHIVE — Katalog Laptop",
  description:
    "Katalog laptop baru dari Acer, ASUS, Lenovo, Apple, HP, Dell, MSI, dan lainnya. Pesan lewat WhatsApp.",
};

const PER_PAGE = 24;

interface HomePageProps {
  searchParams: { q?: string; brand?: string; page?: string };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const products = await getProducts();

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
      <h1 className="md:hidden px-[16px] pt-[28px] pb-[20px] text-center text-[20px] font-light leading-tight text-[#0F0E12]">
        explore products
      </h1>

      <CatalogToolbar
        query={query}
        brand={brand}
        brands={brands}
        total={products.length}
        shown={filtered.length}
      />

      <section className="w-full px-[16px] pb-[24px] md:px-0 md:pb-0">
        <ProductCatalog products={pageItems} />
      </section>

      <CatalogPagination page={page} totalPages={totalPages} params={{ q: query, brand }} />
    </div>
  );
}
