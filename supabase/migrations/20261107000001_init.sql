-- LookLab initial schema: catalogue, user data, RLS, profile trigger, storage policies.
-- Paste the whole file into Supabase > SQL Editor > New query > Run. Safe to run once.
--
-- Access model
--   Catalogue tables: anyone may read; nobody may write from the browser (seed/migrations only).
--   User tables: each user sees only their own rows.
--   tryon_photos, try_on_sessions, saved_looks: written ONLY by the server (secret key),
--   so users cannot forge quotas, statuses or saved images.
--   Explicit GRANTs are used because new Supabase projects may not expose tables by default.

-- ============================================================
-- Catalogue
-- ============================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  image_url text,
  sort_order int not null default 0
);

create table public.aesthetics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  blurb text,
  image_url text,
  sort_order int not null default 0
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null check (char_length(title) between 1 and 120),
  description text,
  category_id uuid not null references public.categories (id),
  section text not null check (section in ('women', 'men', 'unisex')),
  colour text,
  brand text,
  price_amount numeric(10, 2),
  price_currency text check (price_currency is null or char_length(price_currency) = 3),
  source_url text,
  image_url text not null check (image_url like 'https://%'), -- exact image sent to Clothsy
  extra_images text[] not null default '{}',
  is_demo boolean not null default true,
  tryon_enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create index products_category_id_idx on public.products (category_id);
create index products_section_idx on public.products (section);

create table public.product_aesthetics (
  product_id uuid not null references public.products (id) on delete cascade,
  aesthetic_id uuid not null references public.aesthetics (id) on delete cascade,
  primary key (product_id, aesthetic_id)
);
create index product_aesthetics_aesthetic_id_idx on public.product_aesthetics (aesthetic_id);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  cover_image_url text,
  sort_order int not null default 0
);

create table public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  sort_order int not null default 0,
  primary key (collection_id, product_id)
);
create index collection_items_product_id_idx on public.collection_items (product_id);

-- ============================================================
-- User data
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.style_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sections text[] not null default '{}',
  aesthetic_slugs text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- Provider photo ids only (opaque, up to 600 chars). Never photo bytes.
create table public.tryon_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  clothsy_image_id text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index tryon_photos_user_expires_idx on public.tryon_photos (user_id, expires_at desc);

create table public.try_on_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id),
  request_id text not null unique check (request_id ~ '^[A-Za-z0-9_-]{8,128}$'),
  clothsy_job_id text,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  result_url text,
  result_expires_at timestamptz,
  error_code text,
  error_message text, -- shopper-safe text only
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index try_on_sessions_user_created_idx on public.try_on_sessions (user_id, created_at desc);
create index try_on_sessions_user_status_idx on public.try_on_sessions (user_id, status);
-- Database-level guard: at most one pending try-on per user (the API returns 409 on conflict).
create unique index try_on_sessions_one_pending_per_user on public.try_on_sessions (user_id)
  where status = 'pending';

create table public.saved_looks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_title text not null,       -- snapshot
  product_image_url text not null,   -- snapshot
  storage_path text not null unique, -- saved-looks/{user_id}/{look_id}.{ext}
  try_on_session_id uuid references public.try_on_sessions (id) on delete set null,
  created_at timestamptz not null default now()
);
create index saved_looks_user_created_idx on public.saved_looks (user_id, created_at desc);

-- ============================================================
-- Triggers
-- ============================================================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger style_preferences_touch
  before update on public.style_preferences
  for each row execute function public.touch_updated_at();

-- ============================================================
-- Privileges: start from nothing, then grant only what clients need
-- ============================================================
revoke all on
  public.categories, public.aesthetics, public.products, public.product_aesthetics,
  public.collections, public.collection_items, public.profiles, public.style_preferences,
  public.favorites, public.tryon_photos, public.try_on_sessions, public.saved_looks
from anon, authenticated;

grant select on
  public.categories, public.aesthetics, public.products, public.product_aesthetics,
  public.collections, public.collection_items
to anon, authenticated;

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.style_preferences to authenticated;
grant select, insert, delete on public.favorites to authenticated;
-- Users may read their sessions but not the provider job id.
grant select (id, product_id, status, result_url, result_expires_at, error_code, error_message, created_at, finished_at)
  on public.try_on_sessions to authenticated;
grant select on public.saved_looks to authenticated; -- deletes go via the server so the file is removed too
-- tryon_photos: no client access at all (server only).

grant all on
  public.categories, public.aesthetics, public.products, public.product_aesthetics,
  public.collections, public.collection_items, public.profiles, public.style_preferences,
  public.favorites, public.tryon_photos, public.try_on_sessions, public.saved_looks
to service_role;

-- ============================================================
-- Row level security
-- ============================================================
alter table public.categories enable row level security;
alter table public.aesthetics enable row level security;
alter table public.products enable row level security;
alter table public.product_aesthetics enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.profiles enable row level security;
alter table public.style_preferences enable row level security;
alter table public.favorites enable row level security;
alter table public.tryon_photos enable row level security;
alter table public.try_on_sessions enable row level security;
alter table public.saved_looks enable row level security;

create policy "catalogue readable" on public.categories for select to anon, authenticated using (true);
create policy "catalogue readable" on public.aesthetics for select to anon, authenticated using (true);
create policy "catalogue readable" on public.products for select to anon, authenticated using (true);
create policy "catalogue readable" on public.product_aesthetics for select to anon, authenticated using (true);
create policy "catalogue readable" on public.collections for select to anon, authenticated using (true);
create policy "catalogue readable" on public.collection_items for select to anon, authenticated using (true);

create policy "own profile" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "own preferences" on public.style_preferences for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own favorites read" on public.favorites for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "own favorites add" on public.favorites for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "own favorites remove" on public.favorites for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "own sessions read" on public.try_on_sessions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "own looks read" on public.saved_looks for select to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================
-- Storage: saved-looks is private; a user may read only files under their own folder.
-- Writes and deletes go through the server (secret key). Buckets already exist.
-- ============================================================
create policy "saved looks: owner can read" on storage.objects for select to authenticated
  using (bucket_id = 'saved-looks' and (storage.foldername(name))[1] = (select auth.uid())::text);
