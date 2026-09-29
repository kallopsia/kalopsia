"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "./Toast";
import {
  badgeClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./styles";
import { formatRupiah } from "@/lib/pricing";

interface WindowsInstallFormProps {
  initialHarga: number;
  initialDeskripsi: string;
  updatedAt: string | null;
}

export default function WindowsInstallForm({
  initialHarga,
  initialDeskripsi,
  updatedAt,
}: WindowsInstallFormProps) {
  const router = useRouter();
  const toast = useToast();

  const [harga, setHarga] = useState<string>(String(initialHarga));
  const [deskripsi, setDeskripsi] = useState(initialDeskripsi);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const hargaNumber = Number(harga) || 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setSaving(true);

    try {
      const response = await fetch("/api/admin/services/windows-install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          harga: hargaNumber,
          deskripsi: deskripsi.trim() || null,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(result?.error || "Gagal menyimpan pengaturan.");
        setSaving(false);
        return;
      }
      toast.push("Biaya install ulang Windows disimpan.", "success");
      router.refresh();
    } catch {
      setFormError("Jaringan bermasalah. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-[#D6D6D6] bg-[#FFFFFF] p-[16px] md:p-[24px] max-w-[720px]"
    >
      <div className="mb-[16px]">
        <label className={labelClass} htmlFor="harga">
          Biaya jasa (rupiah penuh)
        </label>
        <input
          id="harga"
          type="number"
          min={0}
          step={1000}
          value={harga}
          onChange={(event) => setHarga(event.target.value)}
          placeholder="150000"
          className={inputClass}
        />
        <div className="mt-[4px] flex flex-wrap items-center gap-[8px]">
          <span className="text-[12px] tabular-nums text-[#0F0E12]">
            {hargaNumber > 0 ? formatRupiah(hargaNumber) : "-"}
          </span>
          {hargaNumber <= 0 && <span className={badgeClass("grey")}>harga belum ditetapkan</span>}
        </div>
      </div>

      <div className="mb-[24px]">
        <label className={labelClass} htmlFor="deskripsi">
          Deskripsi / durasi pengerjaan (opsional, tampil di halaman layanan)
        </label>
        <textarea
          id="deskripsi"
          value={deskripsi}
          onChange={(event) => setDeskripsi(event.target.value)}
          rows={5}
          placeholder={"Pengerjaan 3-5 jam, data di partisi D tidak disentuh.\nSudah termasuk install driver dan aplikasi dasar."}
          className={inputClass}
        />
      </div>

      {updatedAt && (
        <div className="mb-[16px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
          terakhir diperbarui {new Date(updatedAt).toLocaleString("id-ID")}
        </div>
      )}

      {formError && (
        <div className="border border-[#B00020] bg-[#FFFFFF] p-[12px] mb-[16px] text-[12px] leading-[1.5] text-[#B00020]">
          {formError}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-[8px]">
        <button type="submit" disabled={saving} className={primaryButtonClass}>
          {saving ? "menyimpan..." : "simpan"}
        </button>
        <a
          href="/lainnya/install-ulang-windows"
          target="_blank"
          rel="noopener noreferrer"
          className={secondaryButtonClass}
        >
          lihat halaman layanan
        </a>
      </div>
    </form>
  );
}
