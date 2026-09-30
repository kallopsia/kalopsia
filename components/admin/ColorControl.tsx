"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "./Toast";
import {
  inputClass,
  labelClass,
  secondaryButtonClass,
  smallSecondaryButtonClass,
  badgeClass,
} from "./styles";
import { COLOR_CODES } from "@/lib/color-config";

interface ColorControlProps {
  productId: string;
  warnaKode: string | null;
  warnaCanon: string | null;
  warnaSource: string;
  groupSlug: string | null;
  duplikat: boolean;
}

export default function ColorControl({
  productId,
  warnaKode,
  warnaCanon,
  warnaSource,
  groupSlug,
  duplikat,
}: ColorControlProps) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(warnaKode || "");
  const [busy, setBusy] = useState(false);

  const save = async (next: string | null) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}/color`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warna: next === null ? null : next === "auto" ? "auto" : next }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Gagal menyimpan warna.");
      toast.push(
        next === "auto"
          ? `Warna direset ke otomatis (${payload.warnaKode || "tanpa warna"}).`
          : next === null
            ? "Warna dikosongkan (produk warna tunggal)."
            : "Warna disimpan (manual). Grup varian dihitung ulang.",
        "success"
      );
      router.refresh();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Gagal menyimpan warna.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-[#D6D6D6] bg-[#FFFFFF] p-[16px] mb-[16px]">
      <div className="flex flex-wrap items-center gap-[8px] mb-[8px]">
        <span className={labelClass.replace("mb-[4px]", "")}>Warna varian</span>
        <span className={badgeClass(warnaSource === "manual" ? "blue" : "grey")}>
          {warnaSource === "manual" ? "manual" : "otomatis"}
        </span>
        <span className="text-[12px] text-[#0F0E12]">
          {warnaKode ? warnaKode : "tanpa warna (warna tunggal)"}
        </span>
        {warnaCanon && warnaCanon !== warnaKode && (
          <span className="text-[12px] text-[#767676]">· kanonik: {warnaCanon}</span>
        )}
        {duplikat && <span className={badgeClass("red")}>duplikat — perlu review</span>}
      </div>

      <p className="text-[11px] text-[#767676] mb-[12px]">
        {groupSlug ? (
          <>
            Tergabung dalam grup varian{" "}
            <code className="text-[#0F0E12]">{groupSlug}</code>. Pembeli melihat semua warna
            dalam satu halaman.
          </>
        ) : (
          <>
            Produk berdiri sendiri (tidak ada varian lain dengan nama + spesifikasi + kategori
            layar yang sama).
          </>
        )}
      </p>

      <div className="flex flex-wrap items-end gap-[8px]">
        <div className="min-w-[220px]">
          <label className={labelClass} htmlFor="warna_kode">
            Atur manual
          </label>
          <select
            id="warna_kode"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className={inputClass}
          >
            <option value="">— tanpa warna —</option>
            {COLOR_CODES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => save(value === "" ? null : value)}
          className={secondaryButtonClass}
        >
          simpan manual
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => save("auto")}
          className={smallSecondaryButtonClass}
          title="Deteksi ulang dari teks spesifikasi / nama produk"
        >
          reset ke otomatis
        </button>
      </div>
    </div>
  );
}
