import { getSupabaseServiceClient } from "./supabase/service";
import type { SoftwareInput, SparepartInput, WindowsInstallInput } from "./service-schema";
import type { SoftwareRow, SparepartRow, WindowsInstallRow } from "@/types/service";

function nullIfEmpty(value: string): string | null {
  const trimmed = (value || "").trim();
  return trimmed ? trimmed : null;
}

function normalizeSoftware(row: SoftwareRow): SoftwareRow {
  return { ...row, harga: Number(row.harga) || 0 };
}

function normalizeSparepart(row: SparepartRow): SparepartRow {
  return { ...row, harga: Number(row.harga) || 0 };
}

// --- Jasa install ulang Windows (satu baris pengaturan) ---

export async function getWindowsInstallSetting(): Promise<WindowsInstallRow | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("services_windows_install")
    .select("*")
    .order("updated_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as WindowsInstallRow;
  return { ...row, harga: Number(row.harga) || 0 };
}

export async function saveWindowsInstallSetting(
  input: WindowsInstallInput
): Promise<WindowsInstallRow> {
  const supabase = getSupabaseServiceClient();
  const payload = { harga: input.harga, deskripsi: input.deskripsi || null };

  const existing = await getWindowsInstallSetting();
  const { data, error } = existing
    ? await supabase
        .from("services_windows_install")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single()
    : await supabase.from("services_windows_install").insert(payload).select().single();

  if (error) throw new Error(error.message);
  const row = data as WindowsInstallRow;
  return { ...row, harga: Number(row.harga) || 0 };
}

// --- Jasa install software ---

export async function listSoftware(): Promise<SoftwareRow[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("software_services")
    .select("*")
    .order("nama", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data || []) as SoftwareRow[]).map(normalizeSoftware);
}

export async function getSoftwareById(id: string): Promise<SoftwareRow | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("software_services")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalizeSoftware(data as SoftwareRow) : null;
}

export async function createSoftware(input: SoftwareInput): Promise<SoftwareRow> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("software_services")
    .insert({
      nama: input.nama,
      slug: input.slug,
      image_url: nullIfEmpty(input.image_url),
      harga: input.harga,
      spesifikasi_minimum: input.spesifikasi_minimum || null,
      is_active: input.is_active,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return normalizeSoftware(data as SoftwareRow);
}

export async function updateSoftware(id: string, input: SoftwareInput): Promise<SoftwareRow> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("software_services")
    .update({
      nama: input.nama,
      slug: input.slug,
      image_url: nullIfEmpty(input.image_url),
      harga: input.harga,
      spesifikasi_minimum: input.spesifikasi_minimum || null,
      is_active: input.is_active,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return normalizeSoftware(data as SoftwareRow);
}

export async function deleteSoftware(id: string): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("software_services").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setSoftwareActive(id: string, isActive: boolean): Promise<SoftwareRow> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("software_services")
    .update({ is_active: isActive })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return normalizeSoftware(data as SoftwareRow);
}

// --- Sparepart ---

export async function listSpareparts(): Promise<SparepartRow[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("spareparts")
    .select("*")
    .order("nama", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data || []) as SparepartRow[]).map(normalizeSparepart);
}

export async function getSparepartById(id: string): Promise<SparepartRow | null> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("spareparts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? normalizeSparepart(data as SparepartRow) : null;
}

export async function createSparepart(input: SparepartInput): Promise<SparepartRow> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("spareparts")
    .insert({
      nama: input.nama,
      slug: input.slug,
      image_url: nullIfEmpty(input.image_url),
      harga: input.harga,
      deskripsi: input.deskripsi || null,
      is_active: input.is_active,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return normalizeSparepart(data as SparepartRow);
}

export async function updateSparepart(id: string, input: SparepartInput): Promise<SparepartRow> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("spareparts")
    .update({
      nama: input.nama,
      slug: input.slug,
      image_url: nullIfEmpty(input.image_url),
      harga: input.harga,
      deskripsi: input.deskripsi || null,
      is_active: input.is_active,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return normalizeSparepart(data as SparepartRow);
}

export async function deleteSparepart(id: string): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("spareparts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setSparepartActive(id: string, isActive: boolean): Promise<SparepartRow> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("spareparts")
    .update({ is_active: isActive })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return normalizeSparepart(data as SparepartRow);
}
