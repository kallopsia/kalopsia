"use client";

import { usePathname } from "next/navigation";

// Menyembunyikan header & footer toko di dalam area /admin.
export default function StoreChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname && pathname.startsWith("/admin")) return null;
  return <>{children}</>;
}
