-- ============================================================
-- SIA PENGELUARAN KOS
-- Supabase PostgreSQL Schema
-- Jalankan seluruh skrip ini di Supabase SQL Editor.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- MASTER KATEGORI
-- ------------------------------------------------------------
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null unique,
  description varchar(255),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- TRANSAKSI PENGELUARAN KAS
-- ------------------------------------------------------------
create table if not exists public.cash_disbursements (
  id uuid primary key default gen_random_uuid(),
  proof_number varchar(50) not null unique,
  transaction_date date not null,
  category_id uuid not null references public.expense_categories(id) on update cascade on delete restrict,
  unit_name varchar(100),
  description varchar(500) not null,
  amount numeric(15,2) not null check (amount > 0),
  payment_method varchar(30) not null default 'Kas'
    check (payment_method in ('Kas', 'Transfer Bank')),
  payment_status varchar(30) not null default 'Lunas'
    check (payment_status in ('Lunas', 'Belum Lunas')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- INDEX
-- ------------------------------------------------------------
create index if not exists idx_cash_disbursements_date
  on public.cash_disbursements(transaction_date desc);

create index if not exists idx_cash_disbursements_category
  on public.cash_disbursements(category_id);

create index if not exists idx_cash_disbursements_status
  on public.cash_disbursements(payment_status);

-- ------------------------------------------------------------
-- UPDATED_AT TRIGGER
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cash_disbursements_updated_at on public.cash_disbursements;

create trigger trg_cash_disbursements_updated_at
before update on public.cash_disbursements
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- DATA KATEGORI AWAL
-- ------------------------------------------------------------
insert into public.expense_categories (name, description)
values
  ('Biaya Utilitas', 'Listrik, air, internet/Wi-Fi'),
  ('Biaya Pemeliharaan & Perbaikan', 'Servis AC, plumbing, cat, dan perbaikan lainnya'),
  ('Biaya Kebersihan & Keamanan', 'Gaji marbot/penjaga, keamanan lingkungan, sampah'),
  ('Biaya Perlengkapan Kos', 'Sabun, perlengkapan kamar mandi, alat kebersihan'),
  ('Biaya Operasional Lainnya', 'Biaya operasional lain di luar kategori utama')
on conflict (name) do nothing;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- Aplikasi browser menggunakan anon key. Untuk penggunaan
-- produksi, sebaiknya aktifkan RLS dan buat policy yang sesuai
-- dengan sistem autentikasi pengguna Anda.
--
-- Jika ini hanya aplikasi lokal/demo tanpa autentikasi:
-- ------------------------------------------------------------
alter table public.expense_categories enable row level security;
alter table public.cash_disbursements enable row level security;

drop policy if exists "anon_read_expense_categories" on public.expense_categories;
drop policy if exists "anon_insert_expense_categories" on public.expense_categories;
drop policy if exists "anon_update_expense_categories" on public.expense_categories;
drop policy if exists "anon_delete_expense_categories" on public.expense_categories;

drop policy if exists "anon_read_cash_disbursements" on public.cash_disbursements;
drop policy if exists "anon_insert_cash_disbursements" on public.cash_disbursements;
drop policy if exists "anon_update_cash_disbursements" on public.cash_disbursements;
drop policy if exists "anon_delete_cash_disbursements" on public.cash_disbursements;

create policy "anon_read_expense_categories"
on public.expense_categories for select to anon using (true);

create policy "anon_insert_expense_categories"
on public.expense_categories for insert to anon with check (true);

create policy "anon_update_expense_categories"
on public.expense_categories for update to anon using (true) with check (true);

create policy "anon_delete_expense_categories"
on public.expense_categories for delete to anon using (true);

create policy "anon_read_cash_disbursements"
on public.cash_disbursements for select to anon using (true);

create policy "anon_insert_cash_disbursements"
on public.cash_disbursements for insert to anon with check (true);

create policy "anon_update_cash_disbursements"
on public.cash_disbursements for update to anon using (true) with check (true);

create policy "anon_delete_cash_disbursements"
on public.cash_disbursements for delete to anon using (true);

-- ============================================================
-- CONTOH QUERY LAPORAN
-- ============================================================

-- Rekap biaya per kategori per bulan:
-- select
--   c.name as kategori,
--   count(t.id) as jumlah_transaksi,
--   sum(t.amount) as total
-- from cash_disbursements t
-- join expense_categories c on c.id = t.category_id
-- where t.transaction_date >= date_trunc('month', current_date)
--   and t.transaction_date < date_trunc('month', current_date) + interval '1 month'
-- group by c.id, c.name
-- order by total desc;

-- Buku kas keluar:
-- select
--   transaction_date,
--   proof_number,
--   description,
--   amount
-- from cash_disbursements
-- order by transaction_date asc, created_at asc;


-- ============================================================
-- DATA CONTOH TRANSAKSI (DEMO)
-- Aman dijalankan berulang kali karena proof_number unik.
-- Tanggal relatif terhadap tanggal saat skrip dijalankan.
-- ============================================================
with cat as (
  select id, name from public.expense_categories
),
demo(proof_number, day_offset, category_name, unit_name, description, amount, payment_method, payment_status) as (
  values
    ('BKK-DEMO-001',  2, 'Biaya Utilitas', 'Umum', 'Pembayaran tagihan listrik area kos', 1250000::numeric, 'Transfer Bank', 'Lunas'),
    ('BKK-DEMO-002',  4, 'Biaya Utilitas', 'Umum', 'Tagihan air PDAM', 385000, 'Transfer Bank', 'Lunas'),
    ('BKK-DEMO-003',  5, 'Biaya Kebersihan & Keamanan', 'Umum', 'Honor petugas kebersihan', 750000, 'Kas', 'Lunas'),
    ('BKK-DEMO-004',  7, 'Biaya Perlengkapan Kos', 'Umum', 'Pembelian sabun dan perlengkapan kamar mandi', 275000, 'Kas', 'Lunas'),
    ('BKK-DEMO-005',  9, 'Biaya Utilitas', 'Umum', 'Langganan internet/Wi-Fi', 450000, 'Transfer Bank', 'Lunas'),
    ('BKK-DEMO-006', 11, 'Biaya Pemeliharaan & Perbaikan', 'Kamar 103', 'Servis AC kamar 103', 425000, 'Transfer Bank', 'Lunas'),
    ('BKK-DEMO-007', 13, 'Biaya Operasional Lainnya', 'Umum', 'Pembelian alat tulis dan administrasi', 95000, 'Kas', 'Lunas'),
    ('BKK-DEMO-008', 15, 'Biaya Kebersihan & Keamanan', 'Umum', 'Iuran keamanan lingkungan', 200000, 'Kas', 'Belum Lunas'),
    ('BKK-DEMO-009', 18, 'Biaya Pemeliharaan & Perbaikan', 'Kamar 202', 'Perbaikan keran dan saluran air', 310000, 'Kas', 'Lunas'),
    ('BKK-DEMO-010', 20, 'Biaya Perlengkapan Kos', 'Umum', 'Pembelian lampu LED dan baterai remote', 180000, 'Kas', 'Lunas'),
    ('BKK-DEMO-011', -27, 'Biaya Utilitas', 'Umum', 'Tagihan listrik bulan sebelumnya', 1180000, 'Transfer Bank', 'Lunas'),
    ('BKK-DEMO-012', -22, 'Biaya Kebersihan & Keamanan', 'Umum', 'Honor penjaga kos', 750000, 'Kas', 'Lunas'),
    ('BKK-DEMO-013', -16, 'Biaya Pemeliharaan & Perbaikan', 'Kamar 105', 'Pengecatan ulang kamar 105', 850000, 'Transfer Bank', 'Lunas'),
    ('BKK-DEMO-014', -56, 'Biaya Utilitas', 'Umum', 'Tagihan air dan listrik', 1540000, 'Transfer Bank', 'Lunas'),
    ('BKK-DEMO-015', -43, 'Biaya Operasional Lainnya', 'Umum', 'Biaya administrasi bank', 25000, 'Kas', 'Lunas')
)
insert into public.cash_disbursements
  (proof_number, transaction_date, category_id, unit_name, description, amount, payment_method, payment_status)
select
  d.proof_number,
  current_date + d.day_offset,
  c.id,
  d.unit_name,
  d.description,
  d.amount,
  d.payment_method,
  d.payment_status
from demo d
join cat c on c.name = d.category_name
on conflict (proof_number) do nothing;
