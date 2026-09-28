import Link from "next/link";

interface NavColumn {
  title: string;
  href: string;
  icon: React.ReactNode;
  links: { label: string; href: string; accent?: boolean }[];
}

const NAV_COLUMNS: NavColumn[] = [
  {
    title: "katalog",
    href: "/",
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
      { label: "produktifitas", href: "/katalog/produktivitas" },
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

export default function Header() {
  return (
    <header className="hidden md:block w-full bg-[#FFFFFF] border-b border-[#D6D6D6] select-none">
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
    </header>
  );
}
