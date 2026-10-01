import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <PageShell kicker="INFO // LEGAL" title="Terms">
      <div className="space-y-[16px] text-[13px] leading-[1.7] text-[#0F0E12]">
        <p>
          Dengan menggunakan situs KALOPSIA TECH, Anda menyetujui ketentuan berikut.
          Katalog ini menampilkan informasi produk dan harga indikatif; harga final
          dikonfirmasi ulang melalui chat WhatsApp sebelum pembayaran.
        </p>
        <p>
          Harga pada katalog dapat berubah sewaktu-waktu mengikuti harga distributor
          tanpa pemberitahuan sebelumnya. Produk dengan label &ldquo;Hubungi kami&rdquo;
          berarti harga belum tersedia dan akan diinformasikan manual oleh tim penjualan.
        </p>
        <p>
          Seluruh unit bergaransi resmi sesuai merek masing-masing. Ketentuan klaim
          garansi dijelaskan pada halaman{" "}
          <Link href="/garansi" className="text-[#0071BB] hover-underline-anim">
            garansi
          </Link>
          . Pembatalan pesanan hanya dapat dilakukan selama unit belum dikirim.
        </p>
        <p>
          Pertanyaan seputar ketentuan ini dapat diajukan lewat halaman{" "}
          <Link href="/contact" className="text-[#0071BB] hover-underline-anim">
            contact
          </Link>
          .
        </p>
      </div>
    </PageShell>
  );
}
