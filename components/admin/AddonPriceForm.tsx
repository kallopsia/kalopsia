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

type Field = "harga" | "harga_14" | "harga_15" | "harga_16";

const FIELD_LABELS: { field: Field; label: string }[] = [
  { field: "harga", label: "Default (fallback)" },
  { field: "harga_14", label: '14"' },
  { field: "harga_15", label: '15"' },
  { field: "harga_16", label: '16"' },
];

export default function AddonPriceForm({ addons }: AddonPriceFormProps) {
  const router = useRouter();
  const toast = useToast();

  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    addons.forEach((addon) => {
      FIELD_LABELS.forEach(({ field }) => {
        initial[`${addon.id}:${field}`] = String(addon[field] ?? 0);
      });
    });
    return initial;
  });
  const [activeById, setActiveById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(addons.map((addon) => [addon.id, addon.is_active]))
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const valueOf = (id: string, field: Field) => Number(prices[`${id}:${field}`]) || 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setSaving(true);

    const payload = {
      addons: addons.map((addon) => ({
        id: addon.id,
        harga: valueOf(addon.id, "harga"),
        harga_14: valueOf(addon.id, "harga_14"),
        harga_15: valueOf(addon.id, "harga_15"),
        harga_16: valueOf(addon.id, "harga_16"),
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
    <form onSubmit={handleSubmit} className="max-w-[860px]">
      <div className="border border-[#D6D6D6] bg-[#F5F5F5] p-[12px] mb-[16px] text-[12px] leading-[1.6] text-[#767676]">
        Harga per ukuran layar dipakai otomatis di halaman produk sesuai kategori layar produk.
        Bila produk <strong className="text-[#0F0E12]">belum terkategori</strong> atau harga
        ukurannya masih <strong className="text-[#0F0E12]">0</strong>, sistem jatuh ke harga{" "}
        <strong className="text-[#0F0E12]">Default (fallback)</strong>.
      </div>

      <div className="divide-y divide-[#D6D6D6] border border-[#D6D6D6] bg-[#FFFFFF] mb-[24px]">
        {addons.map((addon) => (
          <div key={addon.id} className="p-[16px]">
            <div className="flex flex-wrap items-center justify-between gap-[8px] mb-[12px]">
              <span className="text-[13px] uppercase tracking-[0.08em] text-[#0F0E12]">
                {addonLabel(addon.kategori, addon.tipe)}
              </span>
              <label className="flex items-center gap-[8px] text-[12px] text-[#0F0E12]">
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-[12px]">
              {FIELD_LABELS.map(({ field, label }) => {
                const value = valueOf(addon.id, field);
                return (
                  <div key={field}>
                    <label className={labelClass} htmlFor={`${addon.id}-${field}`}>
                      {label}
                    </label>
                    <input
                      id={`${addon.id}-${field}`}
                      type="number"
                      min={0}
                      step={1000}
                      value={prices[`${addon.id}:${field}`] ?? "0"}
                      onChange={(event) =>
                        setPrices((prev) => ({
                          ...prev,
                          [`${addon.id}:${field}`]: event.target.value,
                        }))
                      }
                      placeholder="50000"
                      className={inputClass}
                    />
                    <div className="mt-[4px] text-[11px] tabular-nums text-[#767676]">
                      {value > 0 ? formatRupiah(value) : <span className={badgeClass("grey")}>0</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
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
