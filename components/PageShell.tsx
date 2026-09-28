import type { ReactNode } from "react";

interface PageShellProps {
  kicker: string;
  title: string;
  children: ReactNode;
}

export default function PageShell({ kicker, title, children }: PageShellProps) {
  return (
    <div className="w-full flex-1 bg-[#F5F5F5]">
      <section className="w-full pt-[24px] md:pt-[48px] pb-[48px] md:pb-[80px]">
        <div className="max-w-[1040px] mx-auto px-[16px] md:px-[64px]">
          <div className="text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]">
            {kicker}
          </div>
          <h1 className="text-[24px] md:text-[32px] font-light leading-tight text-[#0F0E12] tracking-tight mb-[24px] md:mb-[32px]">
            {title}
          </h1>
          {children}
        </div>
      </section>
    </div>
  );
}
