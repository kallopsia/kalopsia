import { NextRequest, NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/products";
import { formatSrp, HARGA_BELUM_TERSEDIA } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  // Nomor WhatsApp hanya hidup di server (environment variable), tidak pernah
  // muncul di HTML maupun JavaScript sisi client.
  const whatsappNumber = process.env.WHATSAPP_NUMBER || "6281234567890";
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, "");

  // Chat umum (menu header "chat whatsapp" / halaman info) tanpa konteks produk.
  if (!slug) {
    if (searchParams.get("chat") === "1") {
      const message = "Halo, saya ingin bertanya seputar ketersediaan unit dan promo terkini.";
      return NextResponse.redirect(
        `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`,
        { status: 302 }
      );
    }
    return new NextResponse("Parameter slug produk diperlukan.", { status: 400 });
  }

  const product = await getProductBySlug(slug);
  if (!product) {
    return new NextResponse("Produk tidak ditemukan.", { status: 404 });
  }

  const hargaText = product.hargaTersedia
    ? formatSrp(product.srp)
    : `${HARGA_BELUM_TERSEDIA} (mohon tanya harga terbaru)`;

  const message = [
    `Halo, saya ingin membeli laptop berikut:`,
    ``,
    `Kode Barang: ${product.kodeBarang}`,
    `Produk: ${product.nama}`,
    `Brand: ${product.brand}`,
    `Spesifikasi: ${product.spesifikasiText}`,
    `Catatan: ${product.catatan || "-"}`,
    `Harga: ${hargaText}`,
    ``,
    `Apakah unit ini masih tersedia? Terima kasih.`,
  ].join("\n");

  const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

  if (searchParams.get("format") === "json") {
    return NextResponse.json({ url: waUrl });
  }

  return NextResponse.redirect(waUrl, { status: 302 });
}
