import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Contact — KALOPSIA TECH" };

export default function ContactPage() {
  return (
    <PageShell kicker="INFO // KONTAK" title="Contact">
      <div className="space-y-[16px] text-[13px] leading-[1.7] text-[#0F0E12]">
        <p>
          Tim KALOPSIA TECH melayani pertanyaan stok, harga, spesifikasi, dan pemesanan
          setiap hari pada jam kerja 09.00&ndash;18.00 WIB.
        </p>
        <p>
          Kanal tercepat adalah chat WhatsApp resmi toko:{" "}
          <Link href="/api/wa?chat=1" className="text-[#0071BB] hover-underline-anim">
            chat whatsapp
          </Link>
          . Sebutkan kode barang atau nama tipe laptop yang dimaksud agar kami bisa
          mengecek stok secara langsung.
        </p>
        <p>
          Untuk panduan pembelian dan klaim garansi, lihat halaman{" "}
          <Link href="/cara-pesan" className="text-[#0071BB] hover-underline-anim">
            cara pesan
          </Link>{" "}
          dan{" "}
          <Link href="/garansi" className="text-[#0071BB] hover-underline-anim">
            garansi
          </Link>
          .
        </p>
      </div>
    </PageShell>
  );
}
