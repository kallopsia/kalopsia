"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "./Toast";

const NAV_ITEMS = [
  { href: "/admin", label: "ringkasan" },
  { href: "/admin/products", label: "produk" },
  { href: "/admin/install-ulang", label: "install ulang" },
  { href: "/admin/software", label: "software" },
  { href: "/admin/sparepart", label: "sparepart" },
  { href: "/admin/addons", label: "add-on" },
  { href: "/admin/import", label: "impor excel" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!pathname || pathname === "/admin/login") return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.push("Keluar dari admin.", "info");
      router.replace("/admin/login");
      router.refresh();
    } catch {
      toast.push("Gagal keluar. Coba lagi.", "error");
      setLoggingOut(false);
    }
  };

  return (
    <header className="w-full border-b border-[#D6D6D6] bg-[#0F0E12]">
      <div className="max-w-[1280px] mx-auto px-[16px] md:px-[32px] py-[12px] flex flex-wrap items-center justify-between gap-[12px]">
        <div className="flex items-baseline gap-[8px]">
          <Link href="/admin" className="text-[14px] text-[#FFFFFF] hover-underline-anim">
            KALOPSIA TECH
          </Link>
          <span className="text-[11px] uppercase tracking-[0.08em] text-[#767676]">/ admin</span>
        </div>

        <nav className="flex flex-wrap items-center gap-x-[16px] gap-y-[4px]">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-[11px] uppercase tracking-[0.08em] transition-colors ${
                  active ? "text-[#FFFFFF]" : "text-[#767676] hover:text-[#FFFFFF]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/"
            className="text-[11px] uppercase tracking-[0.08em] text-[#767676] hover:text-[#FFFFFF] transition-colors"
          >
            lihat toko
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-[11px] uppercase tracking-[0.08em] text-[#0071BB] hover:text-[#FFFFFF] transition-colors disabled:opacity-50"
          >
            {loggingOut ? "keluar..." : "keluar"}
          </button>
        </nav>
      </div>
    </header>
  );
}
