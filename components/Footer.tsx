import Link from "next/link";

const FOOTER_LINKS = [
  { label: "newsletter", href: null },
  { label: "retailers", href: null },
  { label: "store", href: "/" },
  { label: "terms", href: null },
  { label: "press", href: null },
  { label: "contact", href: null },
  { label: "returns", href: null },
];

export default function Footer() {
  return (
    <footer className="w-full bg-[#0F0E12] text-[#D6D6D6] select-none">
      {/* Headline band */}
      <div className="py-[56px] md:py-[72px] px-[16px] text-center">
        <Link
          href="/"
          className="text-[28px] md:text-[44px] font-light leading-tight tracking-tight text-[#D6D6D6] hover:text-[#FFFFFF] transition-colors"
        >
          explore all products
        </Link>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#333236]">
        <div className="px-[24px] md:px-[48px] py-[28px] md:py-[32px] flex flex-col md:flex-row items-center justify-between gap-[20px] md:gap-[24px]">
          {/* Left: chevron marker */}
          <span aria-hidden="true" className="hidden md:inline-flex flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 7L9 12L14 7" stroke="#767676" strokeWidth="1.5" />
            </svg>
          </span>

          {/* Center: navigation links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-[24px] md:gap-x-[28px] gap-y-[8px] text-[13px] md:text-[15px]">
            {FOOTER_LINKS.map((link) =>
              link.href ? (
                <Link
                  key={link.label}
                  href={link.href}
                  className="hover-underline-anim text-[#D6D6D6] hover:text-[#FFFFFF] transition-colors"
                >
                  {link.label}
                </Link>
              ) : (
                <span key={link.label}>{link.label}</span>
              )
            )}
          </nav>

          {/* Right: copyright */}
          <div className="text-[13px] md:text-[15px] whitespace-nowrap">
            &copy;{new Date().getFullYear()} KALOPSIA TECH
          </div>
        </div>
      </div>
    </footer>
  );
}
