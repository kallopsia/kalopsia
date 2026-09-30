"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "./Toast";
import { badgeClass, inputClass, labelClass, primaryButtonClass } from "./styles";
import { addonLabel } from "@/lib/addon-labels";
import { formatRupiah } from "@/lib/pricing";
import type { ProductAddonRow } from "@/types/addon";

interface AddonPriceFormProps {
  addons: ProductAddonRow[];
}

export default function AddonPriceForm({ addons }: AddonPriceFormProps) {
  const router = useRouter();
  const toast = useToast();

  const [hargaById, setHargaById] = useState<Record<string, string>>(() =>
    Object.fromEntries(addons.map((addon) => [addon.id, String(addon.harga)]))
  );
  const [activeById, setActiveById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(addons.map((addon) => [addon.id, addon.is_active]))
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setSaving(true);

    const payload = {
      addons: addons.map((addon) => ({
        id: addon.id,
        harga: Number(hargaById[addon.id]) || 0,
        is_active: activeById[addon.id] ?? true,
      })),
    };

    try {
      const response = await fetch("/api/admin/addons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFormError(result?.error || "Gagal menyimpan add-on.");
        setSaving(false);
        return;
      }
      toast.push("Harga add-on disimpan.", "success");
      router.refresh();
    } catch {
      setFormError("Jaringan bermasalah. Coba lagi.");
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-[#D6D6D6] bg-[#FFFFFF] p-[16px] md:p-[24px] max-w-[720px]"
    >
      <div className="divide-y divide-[#D6D6D6] border border-[#D6D6D6] mb-[24px]">
        {addons.map((addon) => {
          const hargaNumber = Number(hargaById[addon.id]) || 0;
          return (
            <div key={addon.id} className="p-[16px] grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
              <div>
                <label className={labelClass} htmlFor={`harga-${addon.id}`}>
                  {addonLabel(addon.kategori, addon.tipe)}
                </label>
                <input
                  id={`harga-${addon.id}`}
                  type="number"
                  min={0}
                  step={1000}
                  value={hargaById[addon.id] ?? "0"}
                  onChange={(event) =>
                    setHargaById((prev) => ({ ...prev, [addon.id]: event.target.value }))
                  }
                  placeholder="50000"
                  className={inputClass}
                />
                <div className="mt-[4px] flex flex-wrap items-center gap-[8px]">
                  <span className="text-[12px] tabular-nums text-[#0F0E12]">
                    {hargaNumber > 0 ? formatRupiah(hargaNumber) : "-"}
                  </span>
                  {hargaNumber <= 0 && (
                    <span className={badgeClass("grey")}>harga belum ditetapkan</span>
                  )}
                </div>
              </div>
              <div className="flex items-end pb-[4px]">
                <label className="flex items-center gap-[8px] text-[13px] text-[#0F0E12]">
                  <input
                    type="checkbox"
                    checked={activeById[addon.id] ?? true}
                    onChange={(event) =>
                      setActiveById((prev) => ({ ...prev, [addon.id]: event.target.checked }))
                    }
                  />
                  aktif ditampilkan di halaman produk
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {formError && (
        <div className="border border-[#B00020] bg-[#FFFFFF] p-[12px] mb-[16px] text-[12px] leading-[1.5] text-[#B00020]">
          {formError}
        </div>
      )}

      <button type="submit" disabled={saving} className={primaryButtonClass}>
        {saving ? "menyimpan..." : "simpan"}
      </button>
    </form>
  );
}
