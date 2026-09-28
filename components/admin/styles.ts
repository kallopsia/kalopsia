// Kelas Tailwind bersama untuk area admin (gaya mengikuti storefront:
// mono, hairline #D6D6D6, tanpa radius, aksen #0071BB).
export const inputClass =
  "w-full border border-[#D6D6D6] bg-[#FFFFFF] px-[12px] py-[8px] text-[13px] leading-[1.5] text-[#0F0E12] placeholder:text-[#767676] focus-visible:outline-none focus:border-[#0F0E12] disabled:bg-[#F5F5F5] disabled:text-[#767676]";

export const labelClass =
  "block text-[11px] uppercase tracking-[0.08em] text-[#767676] mb-[4px]";

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-[8px] border border-[#0F0E12] bg-[#0F0E12] px-[16px] py-[10px] text-[11px] uppercase tracking-[0.08em] text-[#FFFFFF] hover:bg-[#0071BB] hover:border-[#0071BB] transition-colors disabled:opacity-50 disabled:pointer-events-none";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-[8px] border border-[#D6D6D6] bg-[#FFFFFF] px-[16px] py-[10px] text-[11px] uppercase tracking-[0.08em] text-[#0F0E12] hover:border-[#0F0E12] transition-colors disabled:opacity-50 disabled:pointer-events-none";

export const dangerButtonClass =
  "inline-flex items-center justify-center gap-[8px] border border-[#D6D6D6] bg-[#FFFFFF] px-[16px] py-[10px] text-[11px] uppercase tracking-[0.08em] text-[#B00020] hover:border-[#B00020] transition-colors disabled:opacity-50 disabled:pointer-events-none";

export const smallSecondaryButtonClass =
  "inline-flex items-center justify-center border border-[#D6D6D6] bg-[#FFFFFF] px-[10px] py-[6px] text-[11px] uppercase tracking-[0.08em] text-[#0F0E12] hover:border-[#0F0E12] transition-colors disabled:opacity-50 disabled:pointer-events-none";

export const smallDangerButtonClass =
  "inline-flex items-center justify-center border border-[#D6D6D6] bg-[#FFFFFF] px-[10px] py-[6px] text-[11px] uppercase tracking-[0.08em] text-[#B00020] hover:border-[#B00020] transition-colors disabled:opacity-50 disabled:pointer-events-none";

export const cardClass = "border border-[#D6D6D6] bg-[#FFFFFF]";

export const tableHeadClass =
  "text-[11px] uppercase tracking-[0.08em] text-[#767676] text-left p-[12px] whitespace-nowrap";

export const tableCellClass = "p-[12px] text-[13px] text-[#0F0E12] align-top";

export function badgeClass(tone: "blue" | "grey" | "green" | "red"): string {
  const tones: Record<string, string> = {
    blue: "border-[#0071BB] text-[#0071BB]",
    grey: "border-[#D6D6D6] text-[#767676]",
    green: "border-[#1B7F3B] text-[#1B7F3B]",
    red: "border-[#B00020] text-[#B00020]",
  };
  return `inline-block border px-[8px] py-[2px] text-[10px] uppercase tracking-[0.08em] ${tones[tone]}`;
}
