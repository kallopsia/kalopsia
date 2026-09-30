"use client";

import { useState } from "react";
import type { Product } from "@/types/product";
import type { ResolvedAddon } from "@/types/addon";
import ProductGallery from "./ProductGallery";
import ProductPurchaseSection from "./ProductPurchaseSection";
import ProductSpecificationsAccordion from "./ProductSpecificationsAccordion";

interface ProductVariantViewProps {
  variants: Product[];
  addons: ResolvedAddon[];
}

// Tampilan produk dengan pemilih warna. Varian pertama adalah perwakilan grup.
// Produk tunggal (variants.length === 1) dirender tanpa pemilih warna.
export default function ProductVariantView({ variants, addons }: ProductVariantViewProps) {
  const [selectedSlug, setSelectedSlug] = useState(variants[0]?.slug ?? "");
  const selected =
    variants.find((variant) => variant.slug === selectedSlug) || variants[0];

  if (!selected) return null;

  const hasVariants = variants.length > 1;

  return (
    <div className="w-full">
      {hasVariants && (
        <div className="mb-[24px]">
          <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[8px]">
            pilih warna — {variants.length} varian
          </div>
          <div className="flex flex-wrap gap-[8px]">
            {variants.map((variant) => {
              const isSelected = variant.slug === selected.slug;
              const label = variant.warnaKode || variant.kodeBarang;
              return (
                <button
                  key={variant.slug}
                  type="button"
                  onClick={() => setSelectedSlug(variant.slug)}
                  aria-pressed={isSelected}
                  className={`border px-[12px] py-[8px] text-[11px] uppercase tracking-[0.08em] transition-colors text-left ${
                    isSelected
                      ? "border-[#0071BB] text-[#0071BB] bg-[#FFFFFF]"
                      : "border-[#D6D6D6] text-[#0F0E12] bg-[#FFFFFF] hover:border-[#0F0E12]"
                  }`}
                >
                  <span className="block">{label}</span>
                  {!variant.tersedia && (
                    <span className="block text-[#767676] normal-case tracking-normal">
                      tidak tersedia
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-[24px] md:grid-cols-2 md:gap-[40px] items-start mb-[48px] md:mb-[96px]">
        <div>
          <ProductGallery images={selected.gambar} productName={selected.nama} />
        </div>
        <div>
          <ProductPurchaseSection product={selected} addons={addons} />
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
          spesifikasiText={selected.spesifikasiText}
          ringkasan={selected.spesifikasi}
          notes={selected.catatan}
          kodeBarang={selected.kodeBarang}
        />
      </div>
    </div>
  );
}
