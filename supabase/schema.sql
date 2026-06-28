-- ============================================================
-- WETAN GANG — Database Schema (Supabase / PostgreSQL)
-- Jalankan file ini di Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Profil user (1 baris per user, dibuat otomatis saat user pertama login)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  plan text not null default 'trial' check (plan in ('trial','basic','pro')),
  plan_expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

-- Akun Gmail yang dihubungkan user (via OAuth, refresh_token disimpan terenkripsi)
create table if not exists gmail_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  email text not null,
  refresh_token_enc text not null,   -- refresh token Gmail API, sudah dienkripsi (lihat lib/encryption.js)
  status text not null default 'active' check (status in ('active','disconnected','error')),
  last_tested_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, email)
);

-- Kontak/penerima email milik user
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text,
  email text not null,
  created_at timestamptz default now()
);

-- Template email yang bisa dipakai ulang
create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  subject text not null,
  body_html text not null,
  category text default 'promo',
  used_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Campaign (1 broadcast = 1 baris)
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  subject text not null,
  body_html text not null,
  sender_mode text not null default 'single' check (sender_mode in ('single','auto_rotate')),
  gmail_account_id uuid references gmail_accounts(id),  -- dipakai kalau sender_mode = single
  batch_size int not null default 20,
  interval_minutes int not null default 10,
  status text not null default 'draft' check (status in ('draft','running','paused','completed','failed')),
  total_recipients int default 0,
  sent_count int default 0,
  failed_count int default 0,
  next_batch_at timestamptz,         -- dicek oleh cron job, kalau <= now() berarti waktunya kirim batch berikutnya
  created_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Baris per penerima per campaign — ini yang jadi "Logs"
create table if not exists campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  contact_id uuid references contacts(id),
  email text not null,
  name text,
  batch_number int,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  gmail_account_id uuid references gmail_accounts(id),
  error_message text,
  sent_at timestamptz
);
create index if not exists idx_campaign_recipients_status on campaign_recipients(campaign_id, status);

-- Riwayat invoice/pembayaran (diisi oleh webhook payment gateway)
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan text not null,
  amount int not null,           -- dalam Rupiah
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  provider_ref text,             -- order_id dari Midtrans/Xendit
  created_at timestamptz default now(),
  paid_at timestamptz
);

-- ============================================================
-- Trigger: otomatis buat baris profiles saat user baru signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Row Level Security — setiap user HANYA bisa lihat/ubah data miliknya sendiri
-- ============================================================
alter table profiles enable row level security;
alter table gmail_accounts enable row level security;
alter table contacts enable row level security;
alter table templates enable row level security;
alter table campaigns enable row level security;
alter table campaign_recipients enable row level security;
alter table invoices enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own gmail accounts" on gmail_accounts for all using (auth.uid() = user_id);
create policy "own contacts" on contacts for all using (auth.uid() = user_id);
create policy "own templates" on templates for all using (auth.uid() = user_id);
create policy "own campaigns" on campaigns for all using (auth.uid() = user_id);
create policy "own invoices" on invoices for all using (auth.uid() = user_id);
create policy "own campaign recipients" on campaign_recipients for all using (
  campaign_id in (select id from campaigns where user_id = auth.uid())
);

-- Catatan: tabel campaign_recipients & gmail_accounts diakses oleh cron job (server-side)
-- memakai Supabase SERVICE_ROLE key, yang otomatis bypass RLS — jadi tetap aman.
