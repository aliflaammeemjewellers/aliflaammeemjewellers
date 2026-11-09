-- Admin + booking-form hardening (2026-11-06)
-- Paste into: Supabase Dashboard -> project wqxodgwgmbmssalapcjz -> SQL Editor -> New query -> Run.
-- Additive / tightening only. Safe to re-run. Deletes no customer data
-- (it only trims its own rate-limit log, which holds hashed IPs, not bookings).
begin;

-- ---------------------------------------------------------------------------
-- 1. ADMIN CHECK: the email in the token must belong to a CONFIRMED account.
--    Before this, is_admin() trusted the token's email claim alone. That is
--    safe only while "Confirm email" stays switched on in Supabase Auth; if it
--    were ever switched off, anyone could sign up with the owner's address and
--    become admin. Now the account itself must have a confirmed email that is
--    on the allow-list (Google sign-ins are always confirmed).
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_emails a
    join auth.users u on lower(u.email) = lower(a.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
      and u.deleted_at is null
      and (u.banned_until is null or u.banned_until < now())
      and lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. APPOINTMENTS: the public may only INSERT, and only the form's columns.
--    (RLS already hid/blocked the rest; this removes the grants as well.)
-- ---------------------------------------------------------------------------
revoke select, update, delete, truncate, references, trigger on public.appointments from anon;
revoke insert on public.appointments from anon;
grant insert (name, phone, email, purpose, preferred_date, preferred_time, notes, source)
  on public.appointments to anon;

create index if not exists appointments_phone_created_idx
  on public.appointments (phone, created_at desc);

-- Rate-limit log. Holds only a salted hash of the caller's IP, never the IP.
-- No API role can read or write it; only the trigger below (SECURITY DEFINER).
create table if not exists public.alm_appointment_rate (
  id         bigint generated always as identity primary key,
  ip_hash    text not null,
  created_at timestamptz not null default now()
);
create index if not exists alm_appointment_rate_ip_idx
  on public.alm_appointment_rate (ip_hash, created_at desc);
create index if not exists alm_appointment_rate_created_idx
  on public.alm_appointment_rate (created_at);
alter table public.alm_appointment_rate enable row level security;
revoke all on public.alm_appointment_rate from public, anon, authenticated;
drop policy if exists alm_appointment_rate_locked on public.alm_appointment_rate;
create policy alm_appointment_rate_locked on public.alm_appointment_rate
  for all to anon, authenticated using (false) with check (false);

-- ---------------------------------------------------------------------------
-- 3. SERVER-SIDE VALIDATION + RATE LIMITING for website bookings.
--    Runs for every non-admin insert, whatever client sends it (the website,
--    curl, a bot). Limits:
--      per IP    : 3 per 10 minutes, 6 per day
--      per phone : 3 per day
--      whole site: 40 per hour (backstop against many IPs)
--    A rejected save never blocks the visitor: the form has already opened
--    WhatsApp with the same request.
-- ---------------------------------------------------------------------------
create or replace function public.guard_public_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  headers  json;
  client_ip text;
  ip_key   text;
  today    date := (now() at time zone 'Asia/Karachi')::date;
  digits   int;
begin
  if public.is_admin() then return new; end if;

  -- Fields visitors may not set.
  new.status     := 'new';
  new.source     := 'website';
  new.created_at := now();
  new.updated_at := now();

  -- Normalise.
  new.name           := btrim(coalesce(new.name, ''));
  new.phone          := btrim(coalesce(new.phone, ''));
  new.email          := nullif(lower(btrim(coalesce(new.email, ''))), '');
  new.purpose        := btrim(coalesce(new.purpose, ''));
  new.preferred_time := nullif(btrim(coalesce(new.preferred_time, '')), '');
  new.notes          := nullif(btrim(coalesce(new.notes, '')), '');

  -- Validate (same rules as the form in script.js, plus hard limits).
  if char_length(new.name) not between 3 and 120
     or new.name ~ '[<>]' or new.name ~ '[[:cntrl:]]' then
    raise exception 'Please enter your full name.' using errcode = '22023';
  end if;

  digits := char_length(regexp_replace(new.phone, '\D', '', 'g'));
  if new.phone !~ '^[+() 0-9-]{9,20}$' or digits not between 7 and 15 then
    raise exception 'Enter a reachable phone number.' using errcode = '22023';
  end if;

  if new.email is not null and (char_length(new.email) > 254
     or new.email !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$') then
    raise exception 'Please check this email address.' using errcode = '22023';
  end if;

  if new.purpose not in (
       'Engagement / wedding jewellery', 'Bridal polki & kundan suite', 'Bespoke commission',
       '21K gold jewellery', 'Old gold exchange or buyback', 'Gift selection',
       'Repair, polishing or restoration', 'Valuation & certification',
       'engagement', 'bridal', 'custom', 'investment', 'exchange', 'gifting', 'repair', 'valuation') then
    raise exception 'Choose the purpose of your visit.' using errcode = '22023';
  end if;

  if new.preferred_date is null
     or new.preferred_date < today - 1 or new.preferred_date > today + 366 then
    raise exception 'Pick a preferred date within the next year.' using errcode = '22023';
  end if;

  if new.preferred_time is not null and new.preferred_time not in
     ('11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00') then
    raise exception 'Pick a preferred time.' using errcode = '22023';
  end if;

  if new.notes is not null and (char_length(new.notes) > 2000
     or new.notes ~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]') then
    raise exception 'Notes are too long.' using errcode = '22023';
  end if;

  -- Who is calling? Cloudflare's header cannot be forged by the client; the
  -- others are fallbacks. Unknown callers share one bucket.
  headers   := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  client_ip := coalesce(
    nullif(btrim(headers ->> 'cf-connecting-ip'), ''),
    nullif(btrim(headers ->> 'x-real-ip'), ''),
    nullif(btrim(split_part(coalesce(headers ->> 'x-forwarded-for', ''), ',', 1)), ''),
    'unknown');
  ip_key := md5('alm-appt:' || client_ip);

  -- Serialise concurrent bookings so parallel bursts cannot slip past the counts.
  perform pg_advisory_xact_lock(hashtext('alm_appointment_rate'));

  delete from public.alm_appointment_rate where created_at < now() - interval '2 days';

  if (select count(*) from public.alm_appointment_rate
        where ip_hash = ip_key and created_at > now() - interval '10 minutes') >= 3
     or (select count(*) from public.alm_appointment_rate
        where ip_hash = ip_key and created_at > now() - interval '1 day') >= 6
     or (select count(*) from public.appointments
        where regexp_replace(phone, '\D', '', 'g') = regexp_replace(new.phone, '\D', '', 'g')
          and created_at > now() - interval '1 day') >= 3
     or (select count(*) from public.appointments
        where source = 'website' and created_at > now() - interval '1 hour') >= 40 then
    raise exception 'Too many booking requests. Please try again a little later.' using errcode = 'P0001';
  end if;

  insert into public.alm_appointment_rate (ip_hash) values (ip_key);
  return new;
end;
$$;
revoke all on function public.guard_public_appointment() from public, anon, authenticated;

drop trigger if exists guard_public_appointment on public.appointments;
create trigger guard_public_appointment before insert on public.appointments
  for each row execute function public.guard_public_appointment();

-- Visitors cannot change appointments at all (RLS already said so; belt and braces).
revoke update, delete on public.appointments from anon;

notify pgrst, 'reload schema';
commit;

-- After running, check the admin list holds ONLY the owner's Google address:
--   select email from public.admin_emails;
