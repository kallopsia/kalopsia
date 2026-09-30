"use client";

import { useState } from "react";
import type { Product } from "@/types/product";
import type { ResolvedAddon } from "@/types/addon";
import { formatRupiah, formatSrp } from "@/lib/pricing";
import AddonSelector from "./AddonSelector";

interface ProductPurchaseSectionProps {
  product: Product;
  addons: ResolvedAddon[];
}

export default function ProductPurchaseSection({ product, addons }: ProductPurchaseSectionProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleAddon = (id: string) => {
    const target = addons.find((addon) => addon.id === id);
    if (!target) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((selected) => selected !== id);
      // Satu pilihan per kategori: pilihan lain di kategori sama diganti.
      const withoutCategory = prev.filter((selected) => {
        const addon = addons.find((item) => item.id === selected);
        return addon?.kategori !== target.kategori;
      });
      return [...withoutCategory, id];
    });
  };

  const selectedAddons = addons.filter((addon) => selectedIds.includes(addon.id));
  const addonTotal = selectedAddons.reduce((sum, addon) => sum + addon.harga, 0);
  const hasUnpricedAddon = selectedAddons.some((addon) => addon.harga <= 0);

  const addonParams = selectedAddons
    .map((addon) => `&addon=${addon.kategori}:${addon.tipe}`)
    .join("");
  const waUrl = `/api/wa?slug=${encodeURIComponent(product.slug)}${addonParams}`;

  return (
    <div className="w-full border border-[#D6D6D6] bg-[#FFFFFF] p-[16px] sm:p-[24px] md:p-[40px] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.08em] mb-[16px] pb-[8px] border-b border-[#D6D6D6]">
          <span className="text-[#767676]">{product.brand}</span>
          {!product.tersedia ? (
            <span className="inline-flex items-center gap-[6px] text-[#B00020]">
              <span className="w-[6px] h-[6px] bg-[#B00020]" />
              TIDAK TERSEDIA
            </span>
          ) : product.hargaTersedia ? (
            <span className="inline-flex items-center gap-[6px] text-[#0071BB]">
              <span className="w-[6px] h-[6px] bg-[#0071BB]" />
              UNIT BARU / RESMI
            </span>
          ) : (
            <span className="inline-flex items-center gap-[6px] text-[#767676]">
              <span className="w-[6px] h-[6px] bg-[#767676]" />
              HARGA BELUM TERSEDIA
            </span>
          )}
        </div>

        <h1 className="text-[20px] sm:text-[24px] md:text-[28px] font-light leading-[1.25] text-[#0F0E12] mb-[16px] break-words">
          {product.nama}
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[1px] bg-[#D6D6D6] border border-[#D6D6D6] mb-[24px]">
          <div className="bg-[#FFFFFF] p-[16px]">
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
              KODE BARANG
            </div>
            <div className="text-[13px] text-[#0F0E12] break-all">{product.kodeBarang}</div>
          </div>
          <div className="bg-[#FFFFFF] p-[16px]">
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
              KATEGORI
            </div>
            <div className="text-[13px] text-[#0F0E12]">{product.kategori.join(", ")}</div>
          </div>
        </div>

        <div className="mb-[24px] pb-[16px] border-b border-[#D6D6D6]">
          <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
            HARGA JUAL (SRP)
          </div>
          <div className="text-[24px] font-normal tabular-nums text-[#0F0E12]">
            {formatSrp(product.srp)}
          </div>
        </div>

        {product.catatan && (
          <div className="mb-[24px] border border-[#D6D6D6] bg-[#F5F5F5] p-[16px]">
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
              CATATAN PENJUAL
            </div>
            <div className="text-[14px] leading-[1.6] text-[#0F0E12] break-words">
              {product.catatan}
            </div>
          </div>
        )}

        {addons.length > 0 && (
          <div className="mb-[24px]">
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[8px]">
              add-on opsional
            </div>
            <AddonSelector addons={addons} selectedIds={selectedIds} onToggle={toggleAddon} />
            {selectedAddons.length > 0 && product.hargaTersedia && (
              <div className="mt-[12px] flex flex-wrap items-baseline justify-between gap-[8px] border border-[#D6D6D6] bg-[#F5F5F5] p-[12px]">
                <span className="text-[11px] uppercase tracking-[0.08em] text-[#767676]">
                  estimasi total (produk + add-on)
                </span>
                <span className="text-[16px] tabular-nums text-[#0F0E12]">
                  {formatRupiah(product.harga + addonTotal)}
                </span>
                {hasUnpricedAddon && (
                  <span className="w-full text-[11px] uppercase tracking-[0.08em] text-[#767676]">
                    add-on bertanda &ldquo;hubungi kami&rdquo; belum termasuk estimasi
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pt-[24px] border-t border-[#D6D6D6]">
        {product.tersedia ? (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-wa block w-full py-[16px] px-[24px] text-center text-[14px] uppercase tracking-[0.08em] select-none"
          >
            {product.hargaTersedia ? "BELI VIA WHATSAPP" : "TANYA HARGA VIA WHATSAPP"}
          </a>
        ) : (
          <span
            aria-disabled="true"
            className="block w-full py-[16px] px-[24px] text-center text-[14px] uppercase tracking-[0.08em] select-none border border-[#D6D6D6] bg-[#F5F5F5] text-[#767676] cursor-not-allowed"
          >
            TIDAK TERSEDIA
          </span>
        )}

        <div className="mt-[16px] text-[11px] uppercase tracking-[0.08em] text-[#767676] text-center">
          {product.tersedia ? (
            <>
              PESAN OTOMATIS: KODE BARANG + SPESIFIKASI + HARGA
              {selectedAddons.length > 0 ? " + ADD-ON PILIHAN" : ""}
            </>
          ) : (
            <>STOK HABIS — HUBUNGI KAMI UNTUK KETERSEDIAAN</>
          )}
        </div>
      </div>
    </div>
  );
}
