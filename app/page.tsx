import type { Metadata } from "next";
import LandingShowcase from "@/components/LandingShowcase";
import ExploreAllButton from "@/components/ExploreAllButton";
import CatalogEmptyState from "@/components/CatalogEmptyState";
import {
  getProducts,
  getFeaturedProducts,
  getCatalogStatus,
  PRODUCTS_REVALIDATE_SECONDS,
} from "@/lib/products";

export const revalidate = PRODUCTS_REVALIDATE_SECONDS;

export const metadata: Metadata = {
  title: "KALOPSIA TECH",
  description:
    "Seleksi laptop unggulan dari Acer, ASUS, Lenovo, Apple, HP, Dell, MSI, dan lainnya. Pesan lewat WhatsApp.",
};

export default async function LandingPage() {
  const products = await getProducts();
  const status = await getCatalogStatus();
  const featured = await getFeaturedProducts();

  return (
    <div className="w-full flex-1 bg-[#FFFFFF] md:bg-[#F5F5F5]">
      {products.length === 0 ? (
        <section className="max-w-[1280px] mx-auto w-full px-[16px] md:px-[32px] pt-[24px] md:pt-[40px] pb-[24px]">
          <CatalogEmptyState status={status} />
        </section>
      ) : (
        <>
          <LandingShowcase products={featured} />
          <div className="w-full px-[16px] md:px-[32px] py-[32px] md:py-[48px] flex justify-center">
            <ExploreAllButton />
          </div>
        </>
      )}
    </div>
  );
}
