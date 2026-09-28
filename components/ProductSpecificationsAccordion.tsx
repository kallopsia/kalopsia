"use client";

import { useState } from "react";
import type { SpecRingkas } from "@/types/product";

interface ProductSpecificationsAccordionProps {
  spesifikasiText: string;
  ringkasan: SpecRingkas;
  notes: string;
  kodeBarang: string;
  m1VsLama: string;
}

type SpecItem = { key: string; label: string; value?: string };

type SpecCategory = { id: string; title: string; summary: string; items: SpecItem[] };

export default function ProductSpecificationsAccordion({
  spesifikasiText,
  ringkasan,
  notes,
  kodeBarang,
  m1VsLama,
}: ProductSpecificationsAccordionProps) {
  const categories: SpecCategory[] = [
    {
      id: "pabrik",
      title: "SPESIFIKASI DARI DISTRIBUTOR",
      summary: spesifikasiText.slice(0, 60) || "Teks spesifikasi",
      items: [{ key: "teks", label: "Teks lengkap", value: spesifikasiText }],
    },
    {
      id: "ringkasan",
      title: "RINGKASAN TEKNIS",
      summary: [ringkasan.prosesor, ringkasan.memori, ringkasan.penyimpanan]
        .filter(Boolean)
        .join(" · ") || "Belum terdeteksi",
      items: [
        { key: "prosesor", label: "Prosesor", value: ringkasan.prosesor },
        { key: "memori", label: "Memori", value: ringkasan.memori },
        { key: "penyimpanan", label: "Penyimpanan", value: ringkasan.penyimpanan },
        { key: "grafis", label: "Grafis", value: ringkasan.grafis },
        { key: "layar", label: "Layar", value: ringkasan.layar },
        { key: "os", label: "Sistem Operasi", value: ringkasan.sistemOperasi },
      ],
    },
    {
      id: "identitas",
      title: "IDENTITAS UNIT",
      summary: kodeBarang,
      items: [
        { key: "kode", label: "Kode Barang", value: kodeBarang },
        { key: "m1", label: "M1 vs Lama", value: m1VsLama },
      ],
    },
    {
      id: "catatan",
      title: "CATATAN PENJUAL",
      summary: notes || "Tidak ada catatan",
      items: [{ key: "notes", label: "Catatan", value: notes || "-" }],
    },
  ];

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    pabrik: true,
    ringkasan: true,
  });

  const toggleCategory = (id: string) =>
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleExpandAll = () => {
    const allOpen: Record<string, boolean> = {};
    categories.forEach((category) => {
      allOpen[category.id] = true;
    });
    setOpenCategories(allOpen);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between pb-[16px] mb-[16px] border-b border-[#D6D6D6]">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676]">
          DATA TEKNIS UNIT
        </div>
        <div className="flex items-center gap-[16px]">
          <button
            type="button"
            onClick={handleExpandAll}
            className="text-[11px] uppercase tracking-[0.08em] text-[#0F0E12] hover-underline-anim"
          >
            BUKA SEMUA
          </button>
          <span className="text-[#D6D6D6]">|</span>
          <button
            type="button"
            onClick={() => setOpenCategories({})}
            className="text-[11px] uppercase tracking-[0.08em] text-[#0F0E12] hover-underline-anim"
          >
            TUTUP SEMUA
          </button>
        </div>
      </div>

      <div className="border border-[#D6D6D6] divide-y divide-[#D6D6D6] bg-[#FFFFFF]">
        {categories.map((category) => {
          const isOpen = Boolean(openCategories[category.id]);
          const validItems = category.items.filter((item) => Boolean(item.value));
          if (validItems.length === 0) return null;

          return (
            <div key={category.id} className="w-full">
              <button
                type="button"
                onClick={() => toggleCategory(category.id)}
                aria-expanded={isOpen}
                className="w-full p-[16px] md:p-[24px] flex items-center justify-between text-left hover:bg-[#F5F5F5] transition-colors focus-visible:outline-none"
              >
                <div className="pr-[16px] min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
                    {category.title}
                  </div>
                  <div className="text-[14px] text-[#0F0E12] font-normal truncate max-w-[240px] sm:max-w-[500px]">
                    {category.summary}
                  </div>
                </div>
                <div className="flex items-center justify-center w-[24px] h-[24px] border border-[#D6D6D6] bg-[#FFFFFF] flex-shrink-0">
                  <span
                    className={`accordion-icon text-[16px] leading-none text-[#0F0E12] ${
                      isOpen ? "open" : ""
                    }`}
                  >
                    +
                  </span>
                </div>
              </button>

              <div className={`accordion-content ${isOpen ? "open" : ""}`}>
                <div className="border-t border-[#D6D6D6] bg-[#F5F5F5] p-[16px] md:p-[24px]">
                  <dl className="grid grid-cols-12 gap-[1px] bg-[#D6D6D6] border border-[#D6D6D6]">
                    {validItems.map((item) => (
                      <div key={item.key} className="contents">
                        <dt className="col-span-12 sm:col-span-4 bg-[#FFFFFF] p-[12px] text-[11px] uppercase tracking-[0.08em] text-[#767676] flex items-center">
                          {item.label}
                        </dt>
                        <dd className="col-span-12 sm:col-span-8 bg-[#FFFFFF] p-[12px] text-[14px] leading-[1.6] text-[#0F0E12] break-words">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-[16px] text-[11px] uppercase tracking-[0.08em] text-[#767676]">
        Ringkasan teknis diekstrak otomatis dari teks spesifikasi distributor.
      </p>
    </div>
  );
}
