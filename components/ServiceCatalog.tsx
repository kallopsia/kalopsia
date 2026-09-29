import Link from "next/link";
import Image from "next/image";

export type ServiceCatalogItem = {
  id: string;
  href: string;
  nama: string;
  image: string;
  priceText?: string;
};

interface ServiceCatalogProps {
  items: ServiceCatalogItem[];
  emptyText: string;
}

// Grid kartu gambar + nama, mengikuti pola grid laptop (ProductCatalog):
// kartu hitam aspect-square di mobile, sel hairline 3 kolom di desktop.
export default function ServiceCatalog({ items, emptyText }: ServiceCatalogProps) {
  if (items.length === 0) {
    return (
      <div className="w-full border border-[#D6D6D6] bg-[#FFFFFF] p-[24px] md:p-[40px] text-[14px] leading-[1.6] text-[#767676]">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-[16px] md:grid md:grid-cols-3 md:gap-0">
      {items.map((item, index) => (
        <Link
          key={item.id}
          href={item.href}
          className={[
            "product-card group relative flex flex-col overflow-hidden",
            "bg-[#0D0D0D] p-[16px] aspect-square md:aspect-auto",
            "md:bg-transparent md:p-[32px] md:min-h-[400px]",
            index % 3 !== 0 ? "md:border-l md:border-[#D6D6D6]" : "",
            index >= 3 ? "md:border-t md:border-[#D6D6D6]" : "",
          ].join(" ")}
        >
          <div className="z-10">
            <h2 className="text-[13px] leading-tight tracking-tight text-[#FFFFFF] md:text-[15px] md:text-[#0F0E12] line-clamp-3">
              {item.nama}
            </h2>
            {item.priceText && (
              <div className="mt-[4px] text-[12px] tabular-nums text-[#FFFFFF] md:text-[13px] md:text-[#767676]">
                {item.priceText}
              </div>
            )}
          </div>

          <div className="relative w-full flex-1 mt-[12px] md:mt-0 md:my-auto">
            <Image
              src={item.image}
              alt={item.nama}
              fill
              sizes="(max-width: 767px) 100vw, 33vw"
              className="object-contain p-[8px] md:p-[24px] transition-opacity duration-150 ease-out group-hover:opacity-85"
            />
          </div>
        </Link>
      ))}
    </div>
  );
}
