// Prefix internal lama: PR-LAP-<KODE BRAND>-<SISANYA>. Tiga segmen pertama
// ini tidak lagi disimpan maupun ditampilkan; hanya <SISANYA> yang dipakai.
// Regex ini dipakai bersama oleh parser xlsx, script migrasi, slug, dan brand.
export const KODE_PREFIX_RE = /^PR-LAP-[A-Z]{2}-/i;

export function stripKodePrefix(kodeBarang: string): string {
  return kodeBarang.replace(KODE_PREFIX_RE, "");
}

export function hasKodePrefix(kodeBarang: string): boolean {
  return KODE_PREFIX_RE.test(kodeBarang);
}
