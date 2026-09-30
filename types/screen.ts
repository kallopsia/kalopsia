// Baris tabel `product_screen_info` (admin-only; tidak pernah diekspos ke publik).
import type { ScreenCategory } from "@/lib/screen-category";

export type ScreenSource = "auto" | "manual";

export type ProductScreenInfoRow = {
  product_id: string;
  kategori: ScreenCategory;
  sumber: ScreenSource;
  updated_at: string;
};
