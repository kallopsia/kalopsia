"use client";

import { useRouter } from "next/navigation";

// Navigasi client-side ke /shop: scroll smooth ke atas dimulai dulu di dokumen
// yang sama, lalu route diganti tanpa reset scroll bawaan Next (scroll: false)
// supaya animasi scroll berlanjut mulus ke halaman shop.
export default function ExploreAllButton() {
  const router = useRouter();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    router.push("/shop", { scroll: false });
  };

  return (
    <a
      href="/shop"
      onClick={handleClick}
      className="inline-flex w-full md:w-auto items-center justify-center border border-[#0F0E12] bg-[#0F0E12] px-[48px] py-[20px] text-[13px] md:text-[15px] uppercase tracking-[0.08em] text-[#FFFFFF] hover:bg-[#0071BB] hover:border-[#0071BB] transition-colors"
    >
      explore all products
    </a>
  );
}
