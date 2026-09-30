-- Kategori layar per produk (14" / 15" / 16" / belum terkategori).
-- Disimpan di tabel TERPISAH dari products: RLS PostgREST membatasi baris,
-- bukan kolom, sehingga field admin-only ini tidak bocor lewat API publik.
create table if not exists public.product_screen_info (
  product_id uuid primary key references public.products (id) on delete cascade,
  kategori text not null default 'belum' check (kategori in ('14', '15', '16', 'belum')),
  sumber text not null default 'auto' check (sumber in ('auto', 'manual')),
  updated_at timestamptz not null default now()
);

create or replace function public.product_screen_info_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists product_screen_info_set_updated_at on public.product_screen_info;
create trigger product_screen_info_set_updated_at
  before update on public.product_screen_info
  for each row
  execute function public.product_screen_info_set_updated_at();

alter table public.product_screen_info enable row level security;

drop policy if exists product_screen_info_admin_all on public.product_screen_info;
create policy product_screen_info_admin_all
  on public.product_screen_info
  for all
  using (public.is_admin())
  with check (public.is_admin());
