// SRP pada file Excel disimpan dalam satuan ribu rupiah: 17999 = Rp 17.999.000.
// Ubah konstanta ini bila satuan di file sumber berubah.
export const SRP_TO_RUPIAH = 1000;

// Tampil saat SRP 0 / kosong. Ganti di satu tempat ini saja.
export const HARGA_BELUM_TERSEDIA = "Hubungi kami";

export function srpToRupiah(srp: number): number {
  return Math.round((Number(srp) || 0) * SRP_TO_RUPIAH);
}

export function formatRupiah(amount: number): string {
  return `Rp ${Math.round(Number(amount) || 0).toLocaleString("id-ID")}`;
}

// Menerima SRP (ribu rupiah), bukan rupiah penuh.
export function formatSrp(srp: number): string {
  if (!srp || srp <= 0) return HARGA_BELUM_TERSEDIA;
  return formatRupiah(srpToRupiah(srp));
}

export function hasPrice(srp: number): boolean {
  return Number(srp) > 0;
}

// Harga jasa & sparepart sudah dalam rupiah penuh (bukan satuan ribu seperti SRP).
export function formatServicePrice(harga: number): string {
  if (!harga || Number(harga) <= 0) return HARGA_BELUM_TERSEDIA;
  return formatRupiah(harga);
}
