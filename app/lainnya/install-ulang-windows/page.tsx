import PageShell from "@/components/PageShell";
import { getWindowsInstallService } from "@/lib/services";
import { PRODUCTS_REVALIDATE_SECONDS } from "@/lib/supabase/server";
import { formatServicePrice, HARGA_BELUM_TERSEDIA } from "@/lib/pricing";

export const revalidate = PRODUCTS_REVALIDATE_SECONDS;

export const metadata = {
  title: "Install Ulang Windows",
  description:
    "Jasa install ulang Windows untuk laptop: sistem bersih, driver lengkap, aplikasi dasar siap pakai. Pesan lewat WhatsApp.",
};

const LAYANAN = [
  {
    label: "SISTEM BERSIH",
    desc: "Partisi sistem diformat ulang lalu Windows dipasang dari awal, bukan ditimpa. Sisa aplikasi lama, malware, dan file sampah ikut hilang.",
  },
  {
    label: "DRIVER LENGKAP",
    desc: "Driver chipset, grafis, audio, touchpad, sampai tombol fungsi dipasang sesuai tipe unit supaya semuanya jalan normal.",
  },
  {
    label: "APLIKASI DASAR",
    desc: "Browser, pemutar media, dan aplikasi pembaca dokumen sudah terpasang saat unit dikembalikan.",
  },
  {
    label: "DATA KAMU",
    desc: "Sebelum dikerjakan, data di partisi penyimpanan dipindahkan dulu bila kamu minta. Kabari di awal kalau ada file yang harus diselamatkan.",
  },
];

export default async function InstallUlangWindowsPage() {
  const service = await getWindowsInstallService();
  const harga = service ? formatServicePrice(service.harga) : HARGA_BELUM_TERSEDIA;
  const hargaSiap = Boolean(service && service.harga > 0);

  return (
    <PageShell kicker="LAYANAN // INSTALL ULANG WINDOWS" title="Install Ulang Windows">
      <p className="max-w-[640px] text-[14px] leading-[1.7] text-[#0F0E12] mb-[16px]">
        Laptop yang mulai lemot, sering error, atau kena virus biasanya tidak butuh
        diperbaiki satu per satu — butuh dimulai ulang. Kami pasang Windows dari nol,
        rapikan driver, dan siapkan aplikasi dasar supaya unit langsung enak dipakai.
      </p>
      <p className="max-w-[640px] text-[14px] leading-[1.7] text-[#767676] mb-[32px]">
        Pengerjaan biasanya selesai dalam satu hari kerja. Unit bisa diantar ke kami atau
        kami kerjakan lewat janjian, dan hasil akhirnya kami cek bareng kamu sebelum
        dibawa pulang.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px] md:gap-[40px] items-start">
        <div className="border border-[#D6D6D6] bg-[#FFFFFF] divide-y divide-[#D6D6D6]">
          {LAYANAN.map((item) => (
            <div key={item.label} className="p-[16px] md:p-[20px]">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
                {item.label}
              </div>
              <p className="text-[13px] leading-[1.6] text-[#0F0E12]">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="border border-[#D6D6D6] bg-[#FFFFFF] p-[16px] md:p-[24px]">
          <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
            BIAYA JASA
          </div>
          <div className="text-[24px] md:text-[28px] font-light tabular-nums text-[#0F0E12] leading-tight">
            {harga}
          </div>
          {!hargaSiap && (
            <div className="mt-[8px] text-[12px] leading-[1.6] text-[#767676]">
              Harga sedang diperbarui. Tanyakan biaya terkini lewat WhatsApp sebelum memesan.
            </div>
          )}

          {service?.deskripsi && (
            <p className="mt-[16px] pt-[16px] border-t border-[#D6D6D6] text-[13px] leading-[1.7] whitespace-pre-line text-[#0F0E12]">
              {service.deskripsi}
            </p>
          )}

          <div className="mt-[24px] pt-[16px] border-t border-[#D6D6D6]">
            <a
              href="/api/wa?pesan=windows"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-wa block w-full py-[14px] px-[24px] text-center text-[13px] uppercase tracking-[0.08em] select-none"
            >
              pesan sekarang
            </a>
            <div className="mt-[12px] text-[11px] uppercase tracking-[0.08em] text-[#767676] text-center">
              chat terbuka dengan pesan jasa install ulang windows
            </div>
          </div>

          {service && (
            <div className="mt-[16px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
              terakhir diperbarui{" "}
              {new Date(service.updated_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
