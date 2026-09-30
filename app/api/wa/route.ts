import { NextRequest, NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/products";
import { getSoftwareBySlug, getSparepartBySlug } from "@/lib/services";
import { addonLabel } from "@/lib/addon-labels";
import { getActiveAddons } from "@/lib/addons";
import {
  formatRupiah,
  formatServicePrice,
  formatSrp,
  HARGA_BELUM_TERSEDIA,
  srpToRupiah,
} from "@/lib/pricing";
import type { ProductAddonRow } from "@/types/addon";

export const dynamic = "force-dynamic";

// Pesan siap pakai, dipilih lewat ?pesan=<kunci> (atau ?chat=1 untuk compat).
// Kunci dibatasi di server supaya isi chat tidak bisa disuntik dari URL.
const PRESET_MESSAGES: Record<string, string> = {
  chat: "Halo, saya ingin bertanya seputar ketersediaan unit dan promo terkini.",
  stok: "Halo, saya ingin menanyakan stok produk.",
  windows: "Halo, saya ingin pesan jasa install ulang Windows.",
  cod: "Halo, saya ingin bertanya soal layanan COD.",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  // Nomor WhatsApp hanya hidup di server (environment variable), tidak pernah
  // muncul di HTML maupun JavaScript sisi client.
  const whatsappNumber = process.env.WHATSAPP_NUMBER || "6281234567890";
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, "");

  const redirectWith = (message: string) =>
    NextResponse.redirect(
      `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`,
      { status: 302 }
    );

  const softwareSlug = searchParams.get("software");
  if (softwareSlug) {
    const software = await getSoftwareBySlug(softwareSlug);
    if (!software) {
      return new NextResponse("Software tidak ditemukan.", { status: 404 });
    }
    return redirectWith(
      [
        `Halo, saya ingin pesan jasa install software berikut:`,
        ``,
        `Software: ${software.nama}`,
        `Biaya install: ${formatServicePrice(software.harga)}`,
        ``,
        `Mohon info ketersediaan jadwal dan langkah selanjutnya. Terima kasih.`,
      ].join("\n")
    );
  }

  const sparepartSlug = searchParams.get("sparepart");
  if (sparepartSlug) {
    const sparepart = await getSparepartBySlug(sparepartSlug);
    if (!sparepart) {
      return new NextResponse("Sparepart tidak ditemukan.", { status: 404 });
    }
    return redirectWith(
      [
        `Halo, saya ingin pesan sparepart berikut:`,
        ``,
        `Sparepart: ${sparepart.nama}`,
        `Harga: ${formatServicePrice(sparepart.harga)}`,
        ``,
        `Apakah barang ini masih tersedia? Terima kasih.`,
      ].join("\n")
    );
  }

  // Chat umum (tombol "Pesan Sekarang" / "Chat Admin") tanpa konteks produk.
  if (!slug) {
    const presetKey = searchParams.get("pesan");
    const message =
      (presetKey ? PRESET_MESSAGES[presetKey] : undefined) ||
      (searchParams.get("chat") === "1" ? PRESET_MESSAGES.chat : "");
    if (!message) {
      return new NextResponse("Parameter slug produk diperlukan.", { status: 400 });
    }
    return redirectWith(message);
  }

  const product = await getProductBySlug(slug);
  if (!product) {
    return new NextResponse("Produk tidak ditemukan.", { status: 404 });
  }

  const hargaText = product.hargaTersedia
    ? formatSrp(product.srp)
    : `${HARGA_BELUM_TERSEDIA} (mohon tanya harga terbaru)`;

  // Add-on dipilih di halaman produk (?addon=body:matte). Divalidasi ulang di
  // server terhadap add-on aktif supaya isi chat tidak bisa disuntik dari URL.
  const activeAddons = await getActiveAddons();
  const selectedAddons: ProductAddonRow[] = [];
  for (const value of searchParams.getAll("addon")) {
    const [kategori, tipe] = value.split(":");
    const match = activeAddons.find(
      (addon) => addon.kategori === kategori && addon.tipe === tipe
    );
    if (match && !selectedAddons.some((addon) => addon.id === match.id)) {
      selectedAddons.push(match);
    }
  }

  const lines = [
    `Halo, saya ingin membeli laptop berikut:`,
    ``,
    `Kode Barang: ${product.kodeBarang}`,
    `Produk: ${product.nama}`,
    `Brand: ${product.brand}`,
    `Spesifikasi: ${product.spesifikasiText}`,
    `Catatan: ${product.catatan || "-"}`,
    `Harga: ${hargaText}`,
  ];

  if (selectedAddons.length > 0) {
    lines.push(``, `Add-on:`);
    selectedAddons.forEach((addon) => {
      lines.push(`+ ${addonLabel(addon.kategori, addon.tipe)} — ${formatServicePrice(addon.harga)}`);
    });
    if (product.hargaTersedia) {
      const addonTotal = selectedAddons.reduce((sum, addon) => sum + addon.harga, 0);
      const unpriced = selectedAddons.some((addon) => addon.harga <= 0);
      lines.push(
        `Estimasi total: ${formatRupiah(srpToRupiah(product.srp) + addonTotal)}` +
          (unpriced ? " (add-on bertanda Hubungi kami belum termasuk)" : "")
      );
    }
  }

  lines.push(``, `Apakah unit ini masih tersedia? Terima kasih.`);
  const message = lines.join("\n");

  const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

  if (searchParams.get("format") === "json") {
    return NextResponse.json({ url: waUrl });
  }

  return NextResponse.redirect(waUrl, { status: 302 });
}
