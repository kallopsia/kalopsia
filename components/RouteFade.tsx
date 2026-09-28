"use client";

import { usePathname } from "next/navigation";

// Fade masuk 300ms setiap ganti route (key berubah => elemen remount => animasi
// CSS jalan). Dipakai supaya perpindahan landing -> shop terasa halus.
export default function RouteFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="route-fade flex-1 w-full flex flex-col">
      {children}
    </div>
  );
}
