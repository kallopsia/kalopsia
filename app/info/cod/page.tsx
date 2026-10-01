import Link from "next/link";
import PageShell from "@/components/PageShell";
import FaqAccordion, { type FaqItem } from "@/components/FaqAccordion";

export const metadata = {
  title: "COD",
  description:
    "Layanan bayar di tempat (COD) untuk wilayah Bandung, dan pengiriman lewat ekspedisi untuk luar Bandung.",
};

const LANGKAH = [
  {
    no: "01",
    title: "SEPAKATI LEWAT WHATSAPP",
    desc: "Sampaikan unit yang kamu incar, lalu tentukan lokasi dan waktu bertemu yang enak untuk kedua pihak.",
  },
  {
    no: "02",
    title: "CEK UNIT DI TEMPAT",
    desc: "Nyalakan laptopnya, coba keyboard dan touchpad, colok semua port, lihat kondisi fisiknya. Tidak perlu buru-buru.",
  },
  {
    no: "03",
    title: "BAYAR SETELAH COCOK",
    desc: "Pembayaran dilakukan saat itu juga, tunai atau transfer. Kalau unitnya ternyata tidak sesuai, tidak ada kewajiban untuk membeli.",
  },
];

const FAQ: FaqItem[] = [
  {
    id: "toko-offline",
    question: "Ada toko offline yang bisa didatangi?",
    answer:
      "Belum ada. Sampai saat ini kami masih berjualan online, jadi pemesanan dan tanya-tanya semuanya lewat WhatsApp.",
  },
  {
    id: "lokasi-cod",
    question: "COD-nya di mana?",
    answer:
      "Lokasi dan waktunya disepakati berdua. Kami biasanya mengusulkan titik yang mudah dijangkau dan ramai, supaya transaksi nyaman untuk kamu maupun kami. Kesepakatan dicapai sebelum unit dibawa.",
  },
  {
    id: "luar-bandung",
    question: "Saya di luar Bandung, masih bisa COD?",
    answer:
      "Bisa, selama titik bertemunya tetap di sekitar Bandung. Kalau kamu sedang berada di Bandung atau ada orang yang bisa mewakili untuk bertemu di sini, atur saja lewat WhatsApp. Untuk pengiriman ke luar kota, kami pakai jasa ekspedisi.",
  },
];

export default function CodPage() {
  return (
    <PageShell kicker="INFO // COD" title="Bayar di Tempat (COD)">
      <p className="max-w-[640px] text-[14px] leading-[1.7] text-[#0F0E12] mb-[16px]">
        Buat kamu yang ada di Bandung dan lebih tenang kalau melihat barangnya langsung, kami bisa
        bertemu. Unit dicek di tempat sampai kamu yakin, baru dibayar.
      </p>
      <p className="max-w-[640px] text-[14px] leading-[1.7] text-[#767676] mb-[32px]">
        Untuk luar Bandung, pengiriman memakai jasa ekspedisi. Unit dikemas rapat, dikirim setelah
        pembayaran dikonfirmasi, dan nomor resinya kami kirim lewat WhatsApp di hari yang sama.
      </p>

      <div className="border border-[#D6D6D6] bg-[#FFFFFF] divide-y divide-[#D6D6D6] mb-[32px]">
        {LANGKAH.map((step) => (
          <div
            key={step.no}
            className="p-[16px] md:p-[24px] grid grid-cols-1 sm:grid-cols-[80px_1fr] gap-[8px] sm:gap-[24px]"
          >
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

      <div className="mb-[16px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
          YANG SERING DITANYAKAN
        </div>
        <h2 className="text-[20px] md:text-[24px] font-light text-[#0F0E12] tracking-tight mb-[16px]">
          Seputar COD
        </h2>
        <FaqAccordion items={FAQ} />
      </div>

      <div className="mt-[24px] md:mt-[32px] flex flex-wrap items-center gap-[16px]">
        <a
          href="/api/wa?pesan=cod"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-wa inline-block py-[12px] px-[24px] text-[11px] uppercase tracking-[0.08em] select-none"
        >
          tanya soal cod
        </a>
        <Link
          href="/cara-pesan"
          className="text-[11px] uppercase tracking-[0.08em] text-[#0F0E12] hover-underline-anim"
        >
          lihat cara pesan
        </Link>
      </div>
    </PageShell>
  );
}
