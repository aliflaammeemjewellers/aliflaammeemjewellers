-- Stock, customer records and website posts.
-- Apply AFTER supabase/schema.sql, using the SQL editor of the project in
-- supabase-config.js. This additive migration does not delete existing data.
-- It is safe to re-run. No admin email or project credentials are changed.
begin;

-- Keep the existing catalogue as the product record; inventory is an extension.
alter table public.pieces
  add column if not exists sku text,
  add column if not exists track_stock boolean not null default false,
  add column if not exists stock_quantity integer not null default 0,
  add column if not exists low_stock_threshold integer not null default 2,
  add column if not exists price numeric(14,2),
  add column if not exists cost_price numeric(14,2),
  add column if not exists weight_grams numeric(10,3),
  add column if not exists location text,
  add column if not exists in_stock boolean generated always as (not track_stock or stock_quantity > 0) stored;

-- Existing pieces remain visible; their stock is untracked until explicitly set.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'pieces_stock_nonnegative' and conrelid = 'public.pieces'::regclass) then
    alter table public.pieces add constraint pieces_stock_nonnegative
      check (stock_quantity >= 0 and low_stock_threshold >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pieces_money_nonnegative' and conrelid = 'public.pieces'::regclass) then
    alter table public.pieces add constraint pieces_money_nonnegative
      check ((price is null or price >= 0) and (cost_price is null or cost_price >= 0)
        and (weight_grams is null or weight_grams >= 0));
  end if;
end $$;
create unique index if not exists pieces_sku_unique on public.pieces (upper(sku)) where sku is not null;

-- Manually managed customer records, separate from authentication profiles.
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) between 1 and 120),
  email text check (email is null or (length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  phone text check (phone is null or length(phone) between 7 and 30),
  address text,
  notes text check (notes is null or length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);
create unique index if not exists customers_email_unique on public.customers (lower(email)) where email is not null;
create index if not exists customers_name_idx on public.customers (full_name);
drop trigger if exists customers_touch on public.customers;
create trigger customers_touch before update on public.customers
  for each row execute function public.touch_updated_at();

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  category text not null default 'news' check (category in ('news', 'new-arrivals', 'offers', 'jewellery-care')),
  excerpt text check (excerpt is null or length(excerpt) <= 320),
  body text not null default '' check (length(body) <= 30000),
  image_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'draft' and published_at is null) or (status = 'published' and published_at is not null)),
  check (status = 'draft' or length(trim(body)) > 0)
);
create index if not exists posts_published_idx on public.posts (published_at desc) where status = 'published';
drop trigger if exists posts_touch on public.posts;
create trigger posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();

alter table public.customers enable row level security;
alter table public.posts enable row level security;
revoke all on public.customers from public, anon, authenticated;
revoke all on public.posts from public, anon, authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.posts to authenticated;
grant select on public.posts to anon;

drop policy if exists customers_admin_all on public.customers;
create policy customers_admin_all on public.customers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists posts_admin_all on public.posts;
create policy posts_admin_all on public.posts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists posts_public_read on public.posts;
create policy posts_public_read on public.posts
  for select to anon, authenticated
  using (status = 'published' and published_at <= now());

-- Column privileges keep cost, SKU, quantity and storage location private.
-- RLS alone cannot hide individual columns. Never grant table-wide SELECT on
-- pieces to authenticated: that would also grant its private inventory columns.
revoke select on public.pieces from public, anon, authenticated;
grant select (id, name, type, occasion, motif, badge, metals, tags, description,
  story, specs, photo, sort_order, visible, featured, in_stock, updated_at)
  on public.pieces to anon, authenticated;
grant insert, update, delete on public.pieces to authenticated;

-- The public storefront uses this small, intentionally non-sensitive contract.
create or replace view public.catalogue with (security_invoker = true) as
  select id, name, type, occasion, motif, badge, metals, tags, description,
    story, specs, photo, sort_order, visible, featured,
    in_stock, updated_at
  from public.pieces where visible;
revoke all on public.catalogue from public, anon, authenticated;
grant select on public.catalogue to anon, authenticated;

-- Admins get the full row through an explicit permission-checked RPC instead
-- of a table-wide SELECT grant. SECURITY DEFINER is scoped by is_admin().
create or replace function public.get_admin_pieces()
returns setof public.pieces
language sql stable security definer
set search_path = public
as $$
  select * from public.pieces where public.is_admin()
  order by sort_order, name;
$$;
revoke all on function public.get_admin_pieces() from public, anon, authenticated;
grant execute on function public.get_admin_pieces() to authenticated;

notify pgrst, 'reload schema';
commit;
