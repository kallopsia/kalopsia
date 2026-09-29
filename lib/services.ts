import { cache } from "react";
import { getSupabaseReadClient } from "@/lib/supabase/server";
import type { SoftwareRow, SparepartRow, WindowsInstallRow } from "@/types/service";

// Baca publik (anon, ikut ter-cache ISR bersama tag "products"). Bila tabel
// belum dibuat atau query gagal, halaman tetap tampil dengan keadaan kosong
// yang jujur — tanpa data dummy.

function normalizeSoftware(row: SoftwareRow): SoftwareRow {
  return { ...row, harga: Number(row.harga) || 0 };
}

function normalizeSparepart(row: SparepartRow): SparepartRow {
  return { ...row, harga: Number(row.harga) || 0 };
}

export const getWindowsInstallService = cache(async (): Promise<WindowsInstallRow | null> => {
  const supabase = getSupabaseReadClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("services_windows_install")
    .select("*")
    .order("updated_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(`[services] gagal membaca services_windows_install: ${error.message}`);
    return null;
  }
  if (!data) return null;

  const row = data as WindowsInstallRow;
  return { ...row, harga: Number(row.harga) || 0 };
});

export const getSoftwareServices = cache(async (): Promise<SoftwareRow[]> => {
  const supabase = getSupabaseReadClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("software_services")
    .select("*")
    .eq("is_active", true)
    .order("nama", { ascending: true });

  if (error) {
    console.warn(`[services] gagal membaca software_services: ${error.message}`);
    return [];
  }
  return ((data || []) as SoftwareRow[]).map(normalizeSoftware);
});

export const getSoftwareBySlug = cache(async (slug: string): Promise<SoftwareRow | null> => {
  const items = await getSoftwareServices();
  return items.find((item) => item.slug === slug) || null;
});

export const getSpareparts = cache(async (): Promise<SparepartRow[]> => {
  const supabase = getSupabaseReadClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("spareparts")
    .select("*")
    .eq("is_active", true)
    .order("nama", { ascending: true });

  if (error) {
    console.warn(`[services] gagal membaca spareparts: ${error.message}`);
    return [];
  }
  return ((data || []) as SparepartRow[]).map(normalizeSparepart);
});

export const getSparepartBySlug = cache(async (slug: string): Promise<SparepartRow | null> => {
  const items = await getSpareparts();
  return items.find((item) => item.slug === slug) || null;
});
