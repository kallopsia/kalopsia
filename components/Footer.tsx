import Link from "next/link";

const FOOTER_LINKS = [
  { label: "contact", href: "/contact" },
  { label: "terms", href: "/terms" },
];

export default function Footer() {
  return (
    <footer className="w-full bg-[#0F0E12] text-[#D6D6D6] select-none">
      <div className="px-[24px] md:px-[48px] py-[28px] md:py-[32px] flex flex-col md:flex-row items-center justify-between gap-[20px] md:gap-[24px]">
        <nav className="flex flex-wrap items-center justify-center gap-x-[24px] md:gap-x-[28px] gap-y-[8px] text-[13px] md:text-[15px]">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="hover-underline-anim text-[#D6D6D6] hover:text-[#FFFFFF] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="text-[13px] md:text-[15px] whitespace-nowrap">
          &copy;{new Date().getFullYear()} KALOPSIA TECH
        </div>
      </div>
    </footer>
  );
}
