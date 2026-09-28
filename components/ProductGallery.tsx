"use client";

import { useState } from "react";
import Image from "next/image";

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

function labelFor(index: number): string {
  const labels = ["FOTO UTAMA", "TAMPAK LAYAR", "DETAIL PORT & SISI", "DIMENSI & SKALA"];
  return labels[index] || `FOTO ${index + 1}`;
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeImages = (images || []).filter(Boolean);
  const current = Math.min(activeIndex, Math.max(0, safeImages.length - 1));

  if (safeImages.length === 0) {
    return (
      <div className="relative w-full aspect-[4/3] bg-[#EDEDED] border border-[#D6D6D6] flex items-center justify-center">
        <span className="text-[11px] uppercase tracking-[0.08em] text-[#767676]">
          foto belum tersedia
        </span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative w-full aspect-[4/3] bg-[#EDEDED] border border-[#D6D6D6] overflow-hidden mb-[16px]">
        {safeImages.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${
              current === index ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            <Image
              src={src}
              alt={`${productName} — ${labelFor(index)}`}
              fill
              sizes="(max-width: 768px) 100vw, 520px"
              priority={index === 0}
              className="object-contain p-[24px]"
            />
          </div>
        ))}

        <div className="absolute bottom-[8px] left-[8px] z-20 bg-[#FFFFFF] border border-[#D6D6D6] px-[8px] py-[4px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
          <span className="hidden sm:inline">
            VIEW {current + 1}/{safeImages.length}: {labelFor(current)}
          </span>
          <span className="sm:hidden">
            {current + 1}/{safeImages.length}
          </span>
        </div>
      </div>

      {safeImages.length > 1 && (
        <>
          <div
            className="grid gap-[8px]"
            style={{ gridTemplateColumns: `repeat(${Math.min(safeImages.length, 4)}, minmax(0, 1fr))` }}
          >
            {safeImages.slice(0, 4).map((src, index) => {
              const isSelected = current === index;
              return (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Lihat ${labelFor(index)}`}
                  className={`relative aspect-[4/3] bg-[#EDEDED] border transition-colors focus-visible:outline-none ${
                    isSelected
                      ? "border-[#0071BB] ring-1 ring-[#0071BB]"
                      : "border-[#D6D6D6] hover:border-[#0F0E12]"
                  }`}
                >
                  <Image
                    src={src}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    sizes="120px"
                    className="object-contain p-[6px]"
                  />
                </button>
              );
            })}
          </div>

          <div className="mt-[8px] text-[11px] uppercase tracking-[0.08em] text-[#767676] hidden md:block">
            {safeImages.length} FOTO TERSEDIA — INDEKS PERTAMA ADALAH GAMBAR UTAMA
          </div>
        </>
      )}
    </div>
  );
}
