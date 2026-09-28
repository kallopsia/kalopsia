"use client";

import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types/product";
import { formatSrp } from "@/lib/pricing";

interface ProductCatalogProps {
  products: Product[];
}

export default function ProductCatalog({ products }: ProductCatalogProps) {
  if (products.length === 0) {
    return (
      <div className="w-full border border-[#D6D6D6] bg-[#FFFFFF] p-[24px] md:p-[40px] text-[14px] leading-[1.6] text-[#767676]">
        Tidak ada produk yang cocok.
        <Link href="/" className="ml-[8px] text-[#0071BB] hover-underline-anim">
          lihat semua laptop
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-[16px] md:grid md:grid-cols-3 md:gap-0">
      {products.map((product, index) => (
        <Link
          key={product.id}
          href={`/product/${product.slug}`}
          className={[
            "product-card group relative flex flex-col overflow-hidden",
            "bg-[#0D0D0D] p-[16px] aspect-square md:aspect-auto",
            "md:bg-transparent md:p-[32px] md:min-h-[480px]",
            index % 3 !== 0 ? "md:border-l md:border-[#D6D6D6]" : "",
            index >= 3 ? "md:border-t md:border-[#D6D6D6]" : "",
          ].join(" ")}
        >
          <div className="z-10">
            <h2 className="text-[13px] leading-tight tracking-tight text-[#FFFFFF] md:text-[15px] md:text-[#0F0E12] line-clamp-3">
              {product.nama}
            </h2>
            <div className="mt-[4px] text-[11px] uppercase tracking-[0.08em] text-[#9A9A9A] md:text-[#767676]">
              {product.brand}
            </div>
            <span className="hidden md:inline-block mt-[4px]">
              <span className="text-[13px] leading-tight text-[#0071BB] hover-underline-anim">
                buy now
              </span>
              <span className="ml-[8px] text-[13px] leading-tight tabular-nums text-[#767676]">
                {formatSrp(product.srp)}
              </span>
            </span>
            <div className="mt-[4px] text-[12px] tabular-nums text-[#FFFFFF] md:hidden">
              {formatSrp(product.srp)}
            </div>
          </div>

          <div className="relative w-full flex-1 mt-[12px] md:mt-0 md:my-auto">
            <Image
              src={product.gambar[0]}
              alt={product.nama}
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
