import Link from "next/link";
import PageShell from "@/components/PageShell";

const STEPS = [
  {
    no: "01",
    title: "PILIH UNIT DI KATALOG",
    desc: "Buka halaman produk untuk melihat foto unit, audit spesifikasi lengkap, kondisi fisik, dan status stok terkini.",
  },
  {
    no: "02",
    title: "TAMBAHKAN ADD-ON OPSIONAL",
    desc: "Centang add-on seperti anti gores, mouse pad, sleeve, atau adapter. Total harga diperbarui otomatis di halaman produk.",
  },
  {
    no: "03",
    title: "CHECKOUT VIA WHATSAPP",
    desc: "Tekan tombol BELI VIA WHATSAPP. Pesan otomatis terkirim berisi nama unit, add-on pilihan, dan total harga — tanpa mengetik manual.",
  },
  {
    no: "04",
    title: "KONFIRMASI & PENGIRIMAN",
    desc: "Admin membalas ketersediaan unit, instruksi pembayaran, serta opsi kirim atau ambil di toko. Kartu garansi disertakan pada setiap unit.",
  },
];

export default function CaraPesanPage() {
  return (
    <PageShell kicker="BELI // ALUR PEMESANAN" title="Cara Pesan">
      <div className="border border-[#D6D6D6] bg-[#FFFFFF] divide-y divide-[#D6D6D6]">
        {STEPS.map((step) => (
          <div key={step.no} className="p-[16px] md:p-[24px] grid grid-cols-1 sm:grid-cols-[80px_1fr] gap-[8px] sm:gap-[24px]">
            <div className="text-[24px] md:text-[32px] font-light text-[#D6D6D6] tabular-nums leading-none">
              {step.no}
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
                {step.title}
              </div>
              <p className="text-[14px] leading-[1.6] text-[#0F0E12]">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-[24px] md:mt-[32px] flex flex-wrap items-center gap-[16px]">
        <a
          href="/api/wa?chat=1"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-wa inline-block py-[12px] px-[24px] text-[11px] uppercase tracking-[0.08em] select-none"
        >
          chat whatsapp
        </a>
        <Link href="/shop" className="text-[11px] uppercase tracking-[0.08em] text-[#0F0E12] hover-underline-anim">
          lihat semua laptop
        </Link>
      </div>
    </PageShell>
  );
}
