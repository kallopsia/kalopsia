import type { Product } from "@/types/product";
import { formatSrp } from "@/lib/pricing";

interface ProductPurchaseSectionProps {
  product: Product;
}

export default function ProductPurchaseSection({ product }: ProductPurchaseSectionProps) {
  const waUrl = `/api/wa?slug=${encodeURIComponent(product.slug)}`;

  return (
    <div className="w-full border border-[#D6D6D6] bg-[#FFFFFF] p-[16px] sm:p-[24px] md:p-[40px] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.08em] mb-[16px] pb-[8px] border-b border-[#D6D6D6]">
          <span className="text-[#767676]">{product.brand}</span>
          {product.hargaTersedia ? (
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
      </div>

      <div className="pt-[24px] border-t border-[#D6D6D6]">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-wa block w-full py-[16px] px-[24px] text-center text-[14px] uppercase tracking-[0.08em] select-none"
        >
          {product.hargaTersedia ? "BELI VIA WHATSAPP" : "TANYA HARGA VIA WHATSAPP"}
        </a>

        <div className="mt-[16px] text-[11px] uppercase tracking-[0.08em] text-[#767676] text-center">
          PESAN OTOMATIS: KODE BARANG + SPESIFIKASI + HARGA
        </div>
      </div>
    </div>
  );
}
