"use client";

import { useState } from "react";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

interface FaqAccordionProps {
  items: FaqItem[];
}

// Satu pertanyaan terbuka pada satu waktu — pola yang paling umum untuk FAQ.
export default function FaqAccordion({ items }: FaqAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <div className="border border-[#D6D6D6] divide-y divide-[#D6D6D6] bg-[#FFFFFF]">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id} className="w-full">
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              className="w-full p-[16px] md:p-[24px] flex items-center justify-between text-left hover:bg-[#F5F5F5] transition-colors focus-visible:outline-none"
            >
              <span className="pr-[16px] text-[14px] leading-[1.5] text-[#0F0E12]">
                {item.question}
              </span>
              <span className="flex items-center justify-center w-[24px] h-[24px] border border-[#D6D6D6] bg-[#FFFFFF] flex-shrink-0">
                <span className={`accordion-icon text-[16px] leading-none text-[#0F0E12] ${isOpen ? "open" : ""}`}>
                  +
                </span>
              </span>
            </button>

            <div className={`accordion-content ${isOpen ? "open" : ""}`}>
              <div className="border-t border-[#D6D6D6] bg-[#F5F5F5] p-[16px] md:p-[24px]">
                <p className="max-w-[640px] text-[13px] md:text-[14px] leading-[1.7] text-[#0F0E12]">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
