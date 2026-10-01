import Link from "next/link";
import PageShell from "@/components/PageShell";

export const metadata = {
  title: "Cek Stok",
  description:
    "Stok unit berubah sewaktu-waktu. Tanyakan ketersediaan laptop incaran kamu langsung ke admin lewat WhatsApp.",
};

export default function CekStokPage() {
  return (
    <PageShell kicker="INFO // STOK GUDANG" title="Cek Stok">
      <p className="max-w-[640px] text-[14px] leading-[1.7] text-[#0F0E12] mb-[16px]">
        Stok unit bergerak setiap hari — ada barang masuk, ada yang terjual di hari yang sama.
        Karena itu kami tidak memasang daftar ketersediaan di halaman ini: data seperti itu cepat
        basi dan malah menyesatkan.
      </p>
      <p className="max-w-[640px] text-[14px] leading-[1.7] text-[#767676] mb-[32px]">
        Untuk memastikan unit yang kamu incar masih ada, tanya langsung ke admin. Sebutkan kode
        barang atau tipenya, nanti kami cek ke gudang dan kabari hari itu juga.
      </p>

      <div className="border border-[#D6D6D6] bg-[#FFFFFF] p-[16px] md:p-[24px] max-w-[640px]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
          KONFIRMASI KETERSEDIAAN
        </div>
        <div className="text-[14px] leading-[1.6] text-[#0F0E12] mb-[24px]">
          Chat admin dibuka dengan pesan yang sudah terisi, tinggal tambahkan tipe atau kode barang
          yang kamu cari.
        </div>
        <div className="flex flex-wrap items-center gap-[16px]">
          <a
            href="/api/wa?pesan=stok"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-wa inline-block py-[12px] px-[24px] text-[11px] uppercase tracking-[0.08em] select-none"
          >
            chat admin
          </a>
          <Link
            href="/shop"
            className="text-[11px] uppercase tracking-[0.08em] text-[#0F0E12] hover-underline-anim"
          >
            lihat katalog laptop
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
