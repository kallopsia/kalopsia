import type { Metadata } from "next";
import { ToastProvider } from "@/components/admin/Toast";
import AdminNav from "@/components/admin/AdminNav";

export const metadata: Metadata = {
  title: "Admin — KALOPSIA TECH",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="w-full flex-1 flex flex-col bg-[#F5F5F5]">
        <AdminNav />
        <main className="w-full flex-1 px-[16px] md:px-[32px] py-[24px]">
          <div className="max-w-[1280px] mx-auto">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
