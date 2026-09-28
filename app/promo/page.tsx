import PageShell from "@/components/PageShell";

export default function PromoPage() {
  return (
    <PageShell kicker="INFO // PROMO" title="Promo Aktif">
      <div className="border border-[#D6D6D6] bg-[#FFFFFF] p-[24px] md:p-[40px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[8px]">
          STATUS PROMO
        </div>
        <div className="text-[18px] md:text-[24px] font-light text-[#0F0E12] mb-[16px]">
          Belum ada promo aktif saat ini.
        </div>
        <p className="text-[14px] leading-[1.6] text-[#767676] mb-[24px]">
          Promo musiman seperti bundling add-on, potongan ongkir, atau trade-in unit lama
          diumumkan melalui chat WhatsApp dan newsletter toko.
        </p>
        <a
          href="/api/wa?chat=1"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-wa inline-block py-[12px] px-[24px] text-[11px] uppercase tracking-[0.08em] select-none"
        >
          tanya promo via whatsapp
        </a>
      </div>
    </PageShell>
  );
}
