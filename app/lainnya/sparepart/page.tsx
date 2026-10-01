import Link from "next/link";
import ServiceCatalog, { type ServiceCatalogItem } from "@/components/ServiceCatalog";
import { getSpareparts } from "@/lib/services";
import { PRODUCTS_REVALIDATE_SECONDS } from "@/lib/supabase/server";
import { formatServicePrice } from "@/lib/pricing";
import { productPlaceholder } from "@/lib/placeholder";

export const revalidate = PRODUCTS_REVALIDATE_SECONDS;

export const metadata = {
  title: "Sparepart",
  description:
    "Daftar sparepart laptop yang tersedia: baterai, keyboard, RAM, SSD, charger, dan lainnya. Pesan lewat WhatsApp.",
};

export default async function SparepartPage() {
  const spareparts = await getSpareparts();

  const items: ServiceCatalogItem[] = spareparts.map((item) => ({
    id: item.id,
    href: `/lainnya/sparepart/${item.slug}`,
    nama: item.nama,
    image: item.image_url || productPlaceholder(item.nama),
    priceText: formatServicePrice(item.harga),
  }));

  return (
    <div className="w-full flex-1 bg-[#FFFFFF] md:bg-[#F5F5F5]">
      <section className="max-w-[1280px] mx-auto px-[16px] md:px-[32px] pt-[24px] md:pt-[40px] pb-[16px] md:pb-[24px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
          LAINNYA // SPAREPART
        </div>
        <h1 className="text-[24px] md:text-[32px] font-light leading-tight text-[#0F0E12] tracking-tight">
          Sparepart
        </h1>
        <p className="mt-[12px] max-w-[640px] text-[13px] leading-[1.7] text-[#767676]">
          Komponen pengganti untuk laptop — baterai, keyboard, RAM, SSD, charger, dan lainnya.
          Harga yang tertera untuk barangnya saja; kalau sekalian minta dipasang, sebutkan saat
          memesan.
        </p>
        <div className="mt-[12px] flex flex-wrap items-center gap-x-[16px] gap-y-[4px] text-[11px] uppercase tracking-[0.08em]">
          <Link href="/lainnya/install-ulang-windows" className="hover-underline-anim text-[#0071BB]">
            install ulang windows
          </Link>
          <Link href="/lainnya/install-software" className="hover-underline-anim text-[#0071BB]">
            install software
          </Link>
        </div>
      </section>

      <section className="w-full px-[16px] pb-[24px] md:px-0 md:pb-0">
        <div className={items.length === 0 ? "max-w-[1280px] mx-auto md:px-[32px]" : undefined}>
          <ServiceCatalog
            items={items}
            emptyText="Daftar sparepart belum tersedia. Tanyakan lewat WhatsApp komponen yang kamu cari."
          />
        </div>
      </section>
    </div>
  );
}
