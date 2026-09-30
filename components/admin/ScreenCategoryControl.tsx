"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "./Toast";
import { inputClass, labelClass, secondaryButtonClass, smallSecondaryButtonClass, badgeClass } from "./styles";
import { SCREEN_CATEGORY_LABELS } from "@/lib/screen-category";

interface ScreenCategoryControlProps {
  productId: string;
  kategori: string;
  sumber: string;
}

export default function ScreenCategoryControl({
  productId,
  kategori,
  sumber,
}: ScreenCategoryControlProps) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(kategori);
  const [busy, setBusy] = useState(false);

  const currentLabel =
    SCREEN_CATEGORY_LABELS[(kategori as keyof typeof SCREEN_CATEGORY_LABELS) || "belum"] ||
    "Belum terkategori";

  const save = async (next: string) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}/screen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kategori: next }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Gagal menyimpan kategori layar.");
      toast.push(
        next === "auto"
          ? `Kategori layar direset ke otomatis (${
              SCREEN_CATEGORY_LABELS[(payload.kategori as keyof typeof SCREEN_CATEGORY_LABELS) || "belum"]
            }).`
          : "Kategori layar disimpan (manual).",
        "success"
      );
      router.refresh();
    } catch (error) {
      toast.push(error instanceof Error ? error.message : "Gagal menyimpan kategori layar.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-[#D6D6D6] bg-[#FFFFFF] p-[16px] mb-[16px]">
      <div className="flex items-center gap-[8px] mb-[8px]">
        <span className={labelClass.replace("mb-[4px]", "")}>Kategori layar (admin-only)</span>
        <span className={badgeClass(sumber === "manual" ? "blue" : "grey")}>
          {sumber === "manual" ? "manual" : "otomatis"}
        </span>
        <span className="text-[12px] text-[#767676]">saat ini: {currentLabel}</span>
      </div>
      <p className="text-[11px] text-[#767676] mb-[12px]">
        Tidak pernah tampil ke pengunjung maupun API publik. Dipakai untuk mencocokkan harga
        add-on anti gores per ukuran layar.
      </p>
      <div className="flex flex-wrap items-end gap-[8px]">
        <div className="min-w-[200px]">
          <label className={labelClass} htmlFor="screen_kategori">
            Atur manual
          </label>
          <select
            id="screen_kategori"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className={inputClass}
          >
            <option value="14">14&quot;</option>
            <option value="15">15&quot;</option>
            <option value="16">16&quot;</option>
            <option value="belum">Belum terkategori</option>
          </select>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => save(value)}
          className={secondaryButtonClass}
        >
          simpan manual
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => save("auto")}
          className={smallSecondaryButtonClass}
          title="Deteksi ulang dari teks spesifikasi"
        >
          reset ke otomatis
        </button>
      </div>
    </div>
  );
}
