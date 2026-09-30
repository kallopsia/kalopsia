"use client";

import { useState } from "react";
import { ADDON_CATEGORY_LABELS, ADDON_TYPE_LABELS } from "@/lib/addon-labels";
import { formatServicePrice } from "@/lib/pricing";
import type { AddonKategori, ResolvedAddon } from "@/types/addon";

interface AddonSelectorProps {
  addons: ResolvedAddon[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

const CATEGORY_ORDER: AddonKategori[] = ["body", "layar"];

// Satu pilihan per kategori (atau tidak sama sekali): mencentang opsi kedua
// dalam kategori yang sama mengganti pilihan sebelumnya, dicentang ulang = lepas.
export default function AddonSelector({ addons, selectedIds, onToggle }: AddonSelectorProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const categories = CATEGORY_ORDER.filter((kategori) =>
    addons.some((addon) => addon.kategori === kategori)
  );

  if (categories.length === 0) return null;

  return (
    <div className="border border-[#D6D6D6] divide-y divide-[#D6D6D6] bg-[#FFFFFF]">
      {categories.map((kategori) => {
        const isOpen = open[kategori] === true;
        const options = addons.filter((addon) => addon.kategori === kategori);
        const selectedCount = options.filter((option) => selectedIds.includes(option.id)).length;
        return (
          <div key={kategori}>
            <button
              type="button"
              onClick={() => setOpen((prev) => ({ ...prev, [kategori]: !isOpen }))}
              aria-expanded={isOpen}
              className="w-full p-[12px] md:p-[16px] flex items-center justify-between text-left hover:bg-[#F5F5F5] transition-colors focus-visible:outline-none"
            >
              <span className="pr-[16px] text-[12px] md:text-[13px] uppercase tracking-[0.08em] text-[#0F0E12]">
                {ADDON_CATEGORY_LABELS[kategori]}
                {selectedCount > 0 && (
                  <span className="ml-[8px] text-[#0071BB]">
                    {options.find((option) => selectedIds.includes(option.id))?.tipe}
                  </span>
                )}
              </span>
              <span className="flex items-center justify-center w-[24px] h-[24px] border border-[#D6D6D6] bg-[#FFFFFF] flex-shrink-0">
                <span
                  className={`accordion-icon text-[16px] leading-none text-[#0F0E12] ${isOpen ? "open" : ""}`}
                >
                  +
                </span>
              </span>
            </button>

            <div className={`accordion-content ${isOpen ? "open" : ""}`}>
              <div className="border-t border-[#D6D6D6] bg-[#F5F5F5] p-[12px] md:p-[16px] flex flex-col gap-[10px]">
                {options.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-center justify-between gap-[12px] text-[13px] text-[#0F0E12] cursor-pointer"
                  >
                    <span className="flex items-center gap-[8px]">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(option.id)}
                        onChange={() => onToggle(option.id)}
                      />
                      {ADDON_TYPE_LABELS[option.tipe]}
                    </span>
                    <span className="tabular-nums text-[#767676]">
                      {formatServicePrice(option.harga)}
                    </span>
                  </label>
                ))}
                <p className="text-[11px] uppercase tracking-[0.08em] text-[#767676]">
                  opsional — pilih satu per kategori atau kosongkan
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
