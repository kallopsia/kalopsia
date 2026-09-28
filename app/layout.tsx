import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StoreChrome from "@/components/StoreChrome";
import RouteFade from "@/components/RouteFade";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "KALOPSIA TECH — Toko Laptop & Spesifikasi Teknis",
  description: "Katalog spesifikasi laptop terkurasi dengan checkout langsung via WhatsApp.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={jetbrainsMono.variable}>
      <body className="bg-[#FFFFFF] text-[#0F0E12] font-mono min-h-screen flex flex-col selection:bg-[#0071BB] selection:text-white">
        <StoreChrome>
          <Header />
        </StoreChrome>
        <main className="flex-1 w-full bg-[#FFFFFF] flex flex-col">
          <RouteFade>{children}</RouteFade>
        </main>
        <StoreChrome>
          <Footer />
        </StoreChrome>
      </body>
    </html>
  );
}
