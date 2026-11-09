-- Customer reviews (2026-11-09)
-- Paste into: Supabase Dashboard -> project wqxodgwgmbmssalapcjz -> SQL Editor -> New query -> Run.
-- Requires public.is_admin() (created by the earlier migrations).
-- Additive only. Safe to re-run. Deletes no data.
--
-- How it works
--   * Anyone may SUBMIT a review. It is always stored with approved = false.
--   * The public can READ only approved reviews.
--   * Admins (public.is_admin()) can read everything and approve, hide or delete.
--   * A trigger validates every non-admin insert server-side and rate limits it.
begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. TABLE
-- ---------------------------------------------------------------------------
create table if not exists public.alm_reviews (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 2 and 60),
  city       text check (city is null or char_length(city) <= 60),
  rating     int  not null check (rating between 1 and 5),
  body       text not null check (char_length(btrim(body)) between 10 and 600),
  approved   boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists alm_reviews_public_idx
  on public.alm_reviews (approved, created_at desc);

alter table public.alm_reviews enable row level security;

-- ---------------------------------------------------------------------------
-- 2. GRANTS. Visitors may insert only the form's columns; RLS decides rows.
-- ---------------------------------------------------------------------------
revoke all on public.alm_reviews from public, anon, authenticated;
grant insert (name, city, rating, body, approved) on public.alm_reviews to anon, authenticated;
grant select on public.alm_reviews to anon, authenticated;
grant update (approved, name, city, rating, body), delete on public.alm_reviews to authenticated;

-- ---------------------------------------------------------------------------
-- 3. POLICIES
-- ---------------------------------------------------------------------------
drop policy if exists alm_reviews_public_insert on public.alm_reviews;
create policy alm_reviews_public_insert on public.alm_reviews
  for insert to anon, authenticated
  with check (approved = false);

drop policy if exists alm_reviews_public_read on public.alm_reviews;
create policy alm_reviews_public_read on public.alm_reviews
  for select to anon, authenticated
  using (approved = true);

drop policy if exists alm_reviews_admin_read on public.alm_reviews;
create policy alm_reviews_admin_read on public.alm_reviews
  for select to authenticated
  using (public.is_admin());

drop policy if exists alm_reviews_admin_update on public.alm_reviews;
create policy alm_reviews_admin_update on public.alm_reviews
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists alm_reviews_admin_delete on public.alm_reviews;
create policy alm_reviews_admin_delete on public.alm_reviews
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. RATE-LIMIT LOG. Holds only a hash of the caller's IP, never the IP.
--    No API role can read or write it; only the trigger below can.
-- ---------------------------------------------------------------------------
create table if not exists public.alm_review_rate (
  id         bigint generated always as identity primary key,
  ip_hash    text not null,
  created_at timestamptz not null default now()
);
create index if not exists alm_review_rate_ip_idx
  on public.alm_review_rate (ip_hash, created_at desc);
create index if not exists alm_review_rate_created_idx
  on public.alm_review_rate (created_at);
alter table public.alm_review_rate enable row level security;
revoke all on public.alm_review_rate from public, anon, authenticated;
drop policy if exists alm_review_rate_locked on public.alm_review_rate;
create policy alm_review_rate_locked on public.alm_review_rate
  for all to anon, authenticated using (false) with check (false);

-- ---------------------------------------------------------------------------
-- 5. SERVER-SIDE VALIDATION + RATE LIMITING for website reviews.
--    Limits: per IP 3 per 10 minutes and 6 per day; per name 3 per 10 minutes;
--    whole site 30 per hour (backstop against many IPs).
-- ---------------------------------------------------------------------------
create or replace function public.guard_public_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  headers   json;
  client_ip text;
  ip_key    text;
begin
  if public.is_admin() then return new; end if;

  -- Fields visitors may not set.
  new.id         := gen_random_uuid();
  new.approved   := false;
  new.created_at := now();

  -- Normalise.
  new.name := btrim(regexp_replace(coalesce(new.name, ''), '\s+', ' ', 'g'));
  new.city := nullif(btrim(regexp_replace(coalesce(new.city, ''), '\s+', ' ', 'g')), '');
  new.body := btrim(coalesce(new.body, ''));

  -- Validate (same rules as the form in reviews.js).
  if char_length(new.name) not between 2 and 60
     or new.name ~ '[<>]' or new.name ~ '[[:cntrl:]]' then
    raise exception 'Please enter your name.' using errcode = '22023';
  end if;
  if new.city is not null and (char_length(new.city) > 60
     or new.city ~ '[<>]' or new.city ~ '[[:cntrl:]]') then
    raise exception 'Please check the city.' using errcode = '22023';
  end if;
  if new.rating is null or new.rating not between 1 and 5 then
    raise exception 'Choose a star rating.' using errcode = '22023';
  end if;
  if char_length(new.body) not between 10 and 600
     or new.body ~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]' then
    raise exception 'Reviews should be 10 to 600 characters.' using errcode = '22023';
  end if;

  headers   := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  client_ip := coalesce(
    nullif(btrim(headers ->> 'cf-connecting-ip'), ''),
    nullif(btrim(headers ->> 'x-real-ip'), ''),
    nullif(btrim(split_part(coalesce(headers ->> 'x-forwarded-for', ''), ',', 1)), ''),
    'unknown');
  ip_key := md5('alm-review:' || client_ip);

  perform pg_advisory_xact_lock(hashtext('alm_review_rate'));

  delete from public.alm_review_rate where created_at < now() - interval '2 days';

  if (select count(*) from public.alm_review_rate
        where ip_hash = ip_key and created_at > now() - interval '10 minutes') >= 3
     or (select count(*) from public.alm_review_rate
        where ip_hash = ip_key and created_at > now() - interval '1 day') >= 6
     or (select count(*) from public.alm_reviews
        where lower(name) = lower(new.name) and created_at > now() - interval '10 minutes') >= 3
     or (select count(*) from public.alm_reviews
        where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Too many reviews right now. Please try again a little later.' using errcode = 'P0001';
  end if;

  insert into public.alm_review_rate (ip_hash) values (ip_key);
  return new;
end;
$$;
revoke all on function public.guard_public_review() from public, anon, authenticated;

drop trigger if exists guard_public_review on public.alm_reviews;
create trigger guard_public_review before insert on public.alm_reviews
  for each row execute function public.guard_public_review();

notify pgrst, 'reload schema';
commit;

-- To approve from the SQL editor instead of the admin panel:
--   update public.alm_reviews set approved = true where id = '...';
