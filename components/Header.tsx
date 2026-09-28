"use client";

import Link from "next/link";
import { useState } from "react";

interface NavColumn {
  title: string;
  href: string;
  icon: React.ReactNode;
  links: { label: string; href: string; accent?: boolean }[];
}

const NAV_COLUMNS: NavColumn[] = [
  {
    title: "katalog",
    href: "/shop",
    icon: (
      <svg width="22" height="32" viewBox="0 0 24 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="12" y1="14" x2="12" y2="32" stroke="#0F0E12" strokeWidth="1.2" />
        <path d="M12 12C9 7 5 9 5 12C5 15 9 14 12 12Z" fill="#0F0E12" />
        <path d="M12 12C17 9 15 5 12 5C9 5 10 9 12 12Z" fill="#0F0E12" />
        <path d="M12 12C15 17 19 15 19 12C19 9 15 10 12 12Z" fill="#0F0E12" />
        <path d="M12 12C7 15 9 19 12 19C15 19 14 15 12 12Z" fill="#0F0E12" />
      </svg>
    ),
    links: [
      { label: "produktivitas", href: "/katalog/produktivitas" },
      { label: "gaming", href: "/katalog/gaming" },
      { label: "ultrabook", href: "/katalog/ultrabook" },
    ],
  },
  {
    title: "beli",
    href: "/cara-pesan",
    icon: (
      <svg width="22" height="32" viewBox="0 0 24 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="4" width="18" height="26" stroke="#0F0E12" strokeWidth="1.5" />
        <rect x="6" y="8" width="12" height="8" fill="#0F0E12" />
        <line x1="3" y1="20" x2="21" y2="20" stroke="#0F0E12" strokeWidth="1.5" />
        <circle cx="8" cy="25" r="1.5" fill="#0F0E12" />
        <circle cx="16" cy="25" r="1.5" fill="#0F0E12" />
      </svg>
    ),
    links: [
      { label: "cara pesan", href: "/cara-pesan" },
      { label: "chat whatsapp", href: "/api/wa?chat=1", accent: true },
      { label: "garansi", href: "/garansi" },
    ],
  },
  {
    title: "info",
    href: "/cek-stok",
    icon: (
      <svg width="28" height="32" viewBox="0 0 28 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 12V2H12" stroke="#0F0E12" strokeWidth="2" />
        <path d="M2 2L12 12" stroke="#0F0E12" strokeWidth="2" />
        <path d="M16 2H24V10L18 2Z" fill="#0F0E12" />
        <circle cx="10" cy="22" r="6" stroke="#0F0E12" strokeWidth="1.8" />
        <line x1="14" y1="26" x2="20" y2="30" stroke="#0F0E12" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    links: [
      { label: "cek stok", href: "/cek-stok" },
      { label: "spesifikasi", href: "/spesifikasi" },
      { label: "promo", href: "/promo" },
    ],
  },
];

const EASE = "ease-[cubic-bezier(0.4,0,0.2,1)]";

function ExpandedHeader() {
  return (
    <div className="w-full bg-[#FFFFFF] border-b border-[#D6D6D6]">
      <div className="max-w-[1280px] mx-auto px-[16px] md:px-[32px] py-[24px]">
        <div className="flex flex-wrap items-start justify-between gap-y-[24px] gap-x-[16px]">
          {/* Column 1: store logo */}
          <Link href="/" className="flex flex-col leading-[1.05] tracking-tight group pr-[16px]">
            <span className="text-[20px] font-light text-[#0F0E12] group-hover:text-[#0071BB] transition-colors">
              KALOPSIA
            </span>
            <span className="text-[20px] font-light text-[#0F0E12] group-hover:text-[#0071BB] transition-colors">
              TECH
            </span>
          </Link>

          {/* Columns 2-4: navigation */}
          {NAV_COLUMNS.map((column) => (
            <div key={column.title} className="flex items-start gap-[12px] min-w-[130px]">
              <div className="pt-[2px] flex-shrink-0">{column.icon}</div>
              <div>
                <Link href={column.href} className="text-[16px] font-light text-[#0F0E12] block mb-[4px] hover-underline-anim">
                  {column.title}
                </Link>
                <ul className="text-[11px] text-[#767676] leading-[1.4] space-y-[2px]">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className={
                          link.accent
                            ? "text-[#0071BB]"
                            : "hover:text-[#0F0E12] transition-colors"
                        }
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop: bar hitam ringkas, ekspand saat hover/focus */}
      <header
        className="hidden md:block w-full select-none"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        onFocus={() => setExpanded(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setExpanded(false);
          }
        }}
      >
        <div
          className="header-expand-grid w-full"
          style={{ gridTemplateRows: expanded ? "0fr 1fr" : "1fr 0fr" }}
        >
          <div>
            <div
              className={`w-full bg-[#0F0E12] transition-opacity duration-[350ms] ${EASE} ${
                expanded ? "opacity-0" : "opacity-100"
              }`}
            >
              <div className="max-w-[1280px] mx-auto px-[32px] py-[16px] text-center">
                <span className="text-[16px] font-light tracking-[0.08em] text-[#FFFFFF]">
                  KALOPSIA TECH
                </span>
              </div>
            </div>
          </div>
          <div>
            <div
              className={`transition-opacity duration-[350ms] ${EASE} ${
                expanded ? "opacity-100" : "opacity-0"
              }`}
            >
              <ExpandedHeader />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile: bar transparan (logo + hamburger) dengan panel slide-down */}
      <div className="md:hidden">
        <div className="flex items-start justify-between px-[16px] pt-[16px] pb-[8px]">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="flex flex-col leading-[1.05] tracking-tight"
          >
            <span className="text-[20px] font-light text-[#0F0E12]">KALOPSIA</span>
            <span className="text-[20px] font-light text-[#0F0E12]">TECH</span>
          </Link>
          <button
            type="button"
            aria-label="Buka menu navigasi"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="p-[8px] -mr-[8px] text-[#0F0E12]"
          >
            <svg width="22" height="16" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="0" y1="1" x2="22" y2="1" stroke="currentColor" strokeWidth="1.5" />
              <line x1="0" y1="8" x2="22" y2="8" stroke="currentColor" strokeWidth="1.5" />
              <line x1="0" y1="15" x2="22" y2="15" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        <div
          className={`fixed inset-0 z-50 md:hidden ${menuOpen ? "" : "pointer-events-none"}`}
          aria-hidden={!menuOpen}
        >
          <div
            className={`absolute inset-0 bg-[#0F0E12] transition-opacity duration-300 ${EASE} ${
              menuOpen ? "opacity-40" : "opacity-0"
            }`}
            onClick={() => setMenuOpen(false)}
          />
          <div
            className={`absolute inset-x-0 top-0 bg-[#FFFFFF] border-b border-[#D6D6D6] transition-transform duration-300 ${EASE} ${
              menuOpen ? "translate-y-0" : "-translate-y-full"
            }`}
          >
            <div className="flex items-center justify-between px-[16px] py-[16px] border-b border-[#D6D6D6]">
              <span className="text-[16px] font-light tracking-[0.08em] text-[#0F0E12]">
                KALOPSIA TECH
              </span>
              <button
                type="button"
                aria-label="Tutup menu navigasi"
                onClick={() => setMenuOpen(false)}
                className="p-[8px] -mr-[8px] text-[#0F0E12]"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="2" y1="2" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="16" y1="2" x2="2" y2="16" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </div>
            <nav className="px-[16px] py-[20px] flex flex-col gap-[24px] max-h-[70vh] overflow-y-auto">
              {NAV_COLUMNS.map((column) => (
                <div key={column.title}>
                  <Link
                    href={column.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-[16px] font-light text-[#0F0E12] block mb-[6px] hover-underline-anim"
                  >
                    {column.title}
                  </Link>
                  <ul className="text-[13px] text-[#767676] leading-[1.6] space-y-[4px]">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          onClick={() => setMenuOpen(false)}
                          className={
                            link.accent
                              ? "text-[#0071BB]"
                              : "hover:text-[#0F0E12] transition-colors"
                          }
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}
