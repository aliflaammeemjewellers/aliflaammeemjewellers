-- =============================================================================
-- Alif Laam Meem Jewellers — admin panel database setup
-- =============================================================================
-- Run this ONCE in the Supabase SQL editor for the project the website uses
-- (the same one signup.html points at):
--
--   Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
--
-- It is safe to run again: every statement is IF NOT EXISTS / CREATE OR REPLACE,
-- and the catalogue seed uses ON CONFLICT DO NOTHING so your edits are kept.
--
-- What it creates
--   public.admin_emails   the admin allow-list (one row per admin email)
--   public.is_admin()     true when the signed-in user's email is on that list
--   public.appointments   every booking made on appointment.html
--   public.pieces         the live catalogue overlay (seeded from build.py)
--   public.profiles       one row per customer, filled in automatically on signup
--
-- After running it, add your own email:
--   insert into public.admin_emails(email) values ('you@example.com');
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. ADMIN ALLOW-LIST
-- ---------------------------------------------------------------------------
create table if not exists public.admin_emails (
  email      text primary key,
  note       text,
  created_at timestamptz not null default now()
);

-- Does the caller hold admin rights? Defined SECURITY DEFINER so it can read
-- admin_emails without granting everyone SELECT on that table, and used by
-- every policy below. The admin panel calls it directly after sign-in.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and coalesce(auth.jwt() ->> 'email', '') <> ''
  );
$$;

-- Callable by anyone (anon included) — it only ever answers a yes/no about the
-- caller's own token, so there is nothing to leak.
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. APPOINTMENTS
-- ---------------------------------------------------------------------------
create table if not exists public.appointments (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  phone          text not null,
  email          text,
  purpose        text not null,
  preferred_date date not null,
  preferred_time text,
  notes          text,
  status         text not null default 'new'
                 check (status in ('new', 'confirmed', 'completed', 'cancelled')),
  source         text not null default 'website',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists appointments_created_idx
  on public.appointments (created_at desc);
create index if not exists appointments_status_idx
  on public.appointments (status);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists appointments_touch on public.appointments;
create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. PIECES  (live catalogue overlay)
-- ---------------------------------------------------------------------------
-- Mirrors the PRODUCTS list in build.py. Rows here win over the generated
-- static pages: the site reads this table at runtime and hides any piece
-- marked visible = false. Nothing here is required — with an empty table the
-- site simply renders exactly what build.py generated.
create table if not exists public.pieces (
  id          text primary key,
  name        text not null,
  type        text not null,
  occasion    text,
  motif       text,
  badge       text,
  metals      text[] not null default '{}',
  tags        text[] not null default '{}',
  description text,
  story       text,
  specs       jsonb not null default '[]'::jsonb,
  photo       text,
  sort_order  int not null default 0,
  visible     boolean not null default true,
  featured    boolean not null default false,
  updated_at  timestamptz not null default now()
);

create index if not exists pieces_sort_idx on public.pieces (sort_order, name);

drop trigger if exists pieces_touch on public.pieces;
create trigger pieces_touch before update on public.pieces
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 4. PROFILES  (one row per customer)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text,
  full_name       text,
  phone           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  last_sign_in_at timestamptz
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, last_sign_in_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.last_sign_in_at
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Anyone who signed up before this table existed still gets a profile.
insert into public.profiles (id, email, full_name, created_at, last_sign_in_at)
select u.id,
       u.email,
       coalesce(u.raw_user_meta_data ->> 'full_name', ''),
       u.created_at,
       u.last_sign_in_at
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
-- Every table is protected: the browser holds only the public anon key, so these
-- policies are the real access control. The panel's own checks are a UI
-- convenience on top — bypassing them still gets you nothing.

alter table public.admin_emails enable row level security;
alter table public.appointments enable row level security;
alter table public.pieces       enable row level security;
alter table public.profiles     enable row level security;

-- admin_emails: no one reads or writes it through the API. Not even admins —
-- manage the list in the SQL editor or the Table Editor.
drop policy if exists admin_emails_locked on public.admin_emails;
create policy admin_emails_locked on public.admin_emails
  for all to anon, authenticated
  using (false) with check (false);

-- appointments: anybody may lodge one; only admins may read or change them.
drop policy if exists appointments_insert_public on public.appointments;
create policy appointments_insert_public on public.appointments
  for insert to anon, authenticated
  with check (true);

drop policy if exists appointments_admin_all on public.appointments;
create policy appointments_admin_all on public.appointments
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- pieces: the public reads the visible ones, admins read and write everything.
drop policy if exists pieces_public_read on public.pieces;
create policy pieces_public_read on public.pieces
  for select using (visible or public.is_admin());

drop policy if exists pieces_admin_write on public.pieces;
create policy pieces_admin_write on public.pieces
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- profiles: you always see your own row; admins see and edit everyone's.
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- Rows are created by the trigger, so no insert policy is granted.

-- ---------------------------------------------------------------------------
-- 6. CATALOGUE SEED
-- ---------------------------------------------------------------------------
-- The 22 pieces exactly as build.py generates them today. ON CONFLICT DO
-- NOTHING, so re-running this never overwrites edits made in the panel.
insert into public.pieces
  (id, name, type, occasion, motif, badge,
   metals, tags,
   description, story,
   specs, photo, sort_order)
values
  ('meher', 'Meher Solitaire Ring', 'rings', 'engagement', 'rings', 'Bestseller',
   ARRAY['gold21']::text[], ARRAY['BIS Hallmarked', 'IGI Certified']::text[],
   'A brilliant-cut solitaire raised on a hand-forged 21K gold band.', 'Set in a six-claw mount so light reaches the stone from every angle, on a band forged and filed by hand rather than cast. Choose the stone from the tray, then we size the band to the wearer.',
   '[["Metal", "21K yellow gold"], ["Stone", "Brilliant-cut solitaire"], ["Setting", "Six-claw, hand-finished"], ["Sizing", "Sized to the wearer"]]'::jsonb,
   'assets/products/meher.webp', 0),
  ('aab', 'Aab Diamond Pendant', 'necklace', 'gifting', 'pendants', null,
   ARRAY['gold21']::text[], ARRAY['IGI Certified']::text[],
   'Pear-cut diamond suspended on a whisper-fine 21K gold chain.', 'A single pear-cut stone on the finest chain we can safely make, so the pendant moves with the wearer rather than sitting flat.',
   '[["Metal", "21K yellow gold"], ["Stone", "Pear-cut diamond"], ["Chain", "21K gold, included"], ["Length", "Adjustable 16–18 in"]]'::jsonb,
   'assets/products/aab.webp', 1),
  ('zohra', 'Zohra Jhumka Earrings', 'earrings', 'festive', 'earrings', 'New',
   ARRAY['gold21']::text[], ARRAY['Handcrafted', 'Pearl']::text[],
   'Granulated dome jhumkas finished with hand-strung pearls.', 'The domes are raised and then granulated — hundreds of tiny gold beads set one at a time — and finished with pearls strung on silk thread.',
   '[["Metal", "21K yellow gold"], ["Craft", "Granulation, hand-raised domes"], ["Drops", "Freshwater pearl"], ["Fitting", "Screw-back"]]'::jsonb,
   'assets/products/zohra.webp', 2),
  ('sana', 'Sana Engraved Bangles', 'bangles', 'everyday', 'bangles', null,
   ARRAY['gold21']::text[], ARRAY['Set of 4', 'Hand Engraved']::text[],
   'Set of four slim bangles with traditional hand engraving.', 'Four slim bangles, each engraved with the same repeating vine so the set reads as one piece when stacked and as four when worn alone.',
   '[["Metal", "21K yellow gold"], ["Set", "Four bangles"], ["Width", "5 mm each"], ["Finish", "Hand engraved, high polish"]]'::jsonb,
   'assets/products/sana.webp', 3),
  ('noor', 'Noor Polki Bridal Set', 'bridal', 'bridal', 'bridal', 'Signature',
   ARRAY['gold21']::text[], ARRAY['Bridal', 'Polki', 'Made to order']::text[],
   'Uncut polki necklace with matching earrings and maang tikka.', 'Uncut polki set in kundan on a 21K gold base, with matching earrings and maang tikka. Each suite is drafted around your bridal palette and measured to the wearer, so no two are ever identical.',
   '[["Metal", "21K yellow gold, kundan-set"], ["Stones", "Uncut polki, pearls"], ["Craft", "Hand-set at the bench"], ["Delivery", "6–8 weeks, made to order"]]'::jsonb,
   'assets/products/noor.webp', 4),
  ('roshni', 'Roshni Temple Necklace', 'necklace', 'bridal', 'necklace', null,
   ARRAY['gold21']::text[], ARRAY['Bridal']::text[],
   'Temple-inspired nakshi work with ruby and emerald accents.', 'Nakshi work in the temple tradition, with ruby and emerald accents set into the repoussé panels. Made to order in the length you need.',
   '[["Metal", "21K yellow gold"], ["Stones", "Ruby, emerald"], ["Weight", "Approx. 48 g"], ["Length", "Made to order"]]'::jsonb,
   'assets/products/roshni.webp', 5),
  ('hina', 'Hina Eternity Band', 'rings', 'engagement', 'rings', null,
   ARRAY['gold21']::text[], ARRAY['Ethical Diamonds', 'Comfort Fit']::text[],
   'Micro-set diamonds running continuously around the band.', 'Micro-set stones run the full circumference so the band reads the same from any angle. Comfort-fit inner profile for daily wear.',
   '[["Metal", "21K yellow gold"], ["Stones", "Micro-set diamonds"], ["Profile", "Comfort fit"], ["Sizing", "Made to size"]]'::jsonb,
   'assets/products/hina.webp', 6),
  ('gulbahar', 'Gulbahar Emerald Choker', 'bridal', 'bridal', 'bridal', null,
   ARRAY['gold21']::text[], ARRAY['Kundan', 'Emerald']::text[],
   'Zambian emerald drops set in kundan on a 21K gold base.', 'Emerald drops in graduated sizes, each bezel cut to the stone rather than the stone cut to the bezel — which is why this one is always made to order.',
   '[["Metal", "21K gold"], ["Stones", "Zambian emerald"], ["Setting", "Kundan"], ["Delivery", "6–8 weeks"]]'::jsonb,
   'assets/products/gulbahar.webp', 7),
  ('mahtab', 'Mahtab Diamond Studs', 'earrings', 'everyday', 'pendants', 'Bestseller',
   ARRAY['gold21']::text[], ARRAY['IGI Certified', 'Everyday']::text[],
   'Four-prong princess studs that move from desk to dinner.', 'A pair that works with a shalwar kameez and with a shirt collar: four-prong princess studs with closed backs so they sit flat.',
   '[["Metal", "21K yellow gold"], ["Stones", "Princess-cut diamonds"], ["Setting", "Four-prong, closed back"], ["Fitting", "Push-back"]]'::jsonb,
   'assets/products/mahtab.webp', 8),
  ('vasl', 'Vasl Couple Bands', 'rings', 'engagement', 'rings', null,
   ARRAY['gold21']::text[], ARRAY['Brushed finish', 'Engraving included']::text[],
   'A pair of brushed 21K gold bands with a polished inner-edge detail.', 'A pair of brushed 21K gold bands with a slim polished line set into the inner edge — visible to the wearer, not to the room. Engraving inside is included.',
   '[["Metal", "21K yellow gold"], ["Finish", "Brushed with polished detail"], ["Engraving", "Included"], ["Set", "Pair"]]'::jsonb,
   'assets/products/vasl.webp', 9),
  ('dilruba', 'Dilruba Halo Solitaire', 'rings', 'engagement', 'rings', 'New',
   ARRAY['gold21']::text[], ARRAY['Halo']::text[],
   'A brilliant-cut solitaire ringed by a halo of smaller stones.', 'A round brilliant raised above the hand, ringed by a halo of smaller stones that doubles its apparent size. The band is forged from a single wire, so there is no seam to catch.',
   '[["Metal", "21K yellow gold"], ["Stones", "Brilliant centre with halo"], ["Setting", "Four-claw with halo"], ["Sizing", "Made to size"]]'::jsonb,
   'assets/products/dilruba.webp', 10),
  ('zoya', 'Zoya Three-Stone Ring', 'rings', 'engagement', 'rings', null,
   ARRAY['gold21']::text[], ARRAY['Three-stone']::text[],
   'Past, present and future — three stones on a tapered band.', 'Three graduated stones on a band that tapers toward the fingertip: a centre brilliant flanked by two smaller rounds. The side stones are set first, so the centre always sits level.',
   '[["Metal", "21K yellow gold"], ["Stones", "Three brilliant-cut diamonds"], ["Centre", "0.75 ct"], ["Sizing", "Made to size"]]'::jsonb,
   'assets/products/zoya.webp', 11),
  ('reyaz', 'Reyaz Twisted Band', 'rings', 'everyday', 'rings', null,
   ARRAY['gold21']::text[], ARRAY['Twist', 'Satin finish']::text[],
   'Two ribbons of 21K yellow gold twisted into one.', 'Two ribbons of gold twisted around each other, so the band reads differently in every light. Polished to a soft satin so it wears unmarked.',
   '[["Metal", "21K yellow gold"], ["Width", "3 mm"], ["Finish", "Satin"], ["Profile", "Comfort fit"]]'::jsonb,
   'assets/products/reyaz.webp', 12),
  ('mahnoor', 'Mahnoor Sapphire Ring', 'rings', 'festive', 'rings', 'New',
   ARRAY['gold21']::text[], ARRAY['Ceylon Sapphire', 'Filigree']::text[],
   'A Ceylon sapphire crowned in a 21K gold filigree head.', 'A deep-blue Ceylon sapphire in a hand-drawn filigree head, openwork light enough to wear all evening. Blue and gold have been the house pairing since the first counter at the showroom.',
   '[["Metal", "21K yellow gold"], ["Stone", "Ceylon sapphire"], ["Head", "Hand-drawn filigree"], ["Sizing", "Made to size"]]'::jsonb,
   'assets/products/mahnoor.webp', 13),
  ('areeba', 'Areeba Pearl Ring', 'rings', 'gifting', 'rings', null,
   ARRAY['gold21']::text[], ARRAY['South Sea Pearl']::text[],
   'A South Sea pearl cradled in a 21K gold collette.', 'A single South Sea pearl in a slim collette, close to the finger so it does not snag. The pearl is matched for lustre, not just size.',
   '[["Metal", "21K yellow gold"], ["Pearl", "South Sea, 8 mm"], ["Setting", "Collette"], ["Sizing", "Made to size"]]'::jsonb,
   'assets/products/areeba.webp', 14),
  ('dildar', 'Dildar Pavé Band', 'rings', 'engagement', 'rings', null,
   ARRAY['gold21']::text[], ARRAY['Pavé']::text[],
   'Hand-placed micro diamonds set in a 21K yellow gold pavé band.', 'Micro diamonds placed by hand, stone by stone, around a slim 21K yellow gold band. The pavé is set low, so the band can be worn every day without the stones catching.',
   '[["Metal", "21K yellow gold"], ["Stones", "Hand-set micro diamonds"], ["Width", "2.4 mm"], ["Profile", "Comfort fit"]]'::jsonb,
   'assets/products/dildar.webp', 15),
  ('suhani', 'Suhani Signet Ring', 'rings', 'everyday', 'rings', null,
   ARRAY['gold21']::text[], ARRAY['Signet', 'Hand Engraved']::text[],
   'A wide hand-engraved signet, made to your initials.', 'A wide face engraved to your initials or a date, under a hand-cut border. The inside is signed and dated, so the ring can be handed on.',
   '[["Metal", "21K yellow gold"], ["Width", "9 mm"], ["Engraving", "Initials or date"], ["Finish", "High polish"]]'::jsonb,
   'assets/products/suhani.webp', 16),
  ('zar', 'Zar Diamond Cluster Ring', 'rings', 'festive', 'rings', null,
   ARRAY['gold21']::text[], ARRAY['Cluster']::text[],
   'A cluster of mixed-cut diamonds on a 21K gold base.', 'Rounds, pears and brilliants clustered so light passes through the whole head at once. It reads larger than its weight — which is the point.',
   '[["Metal", "21K yellow gold"], ["Stones", "Mixed-cut diamond cluster"], ["Setting", "Cluster"], ["Sizing", "Made to size"]]'::jsonb,
   'assets/products/zar.webp', 17),
  ('sitara', 'Sitara Filigree Kada', 'bangles', 'festive', 'bangles', null,
   ARRAY['gold21']::text[], ARRAY['Filigree']::text[],
   'Wide kada built from hand-drawn gold filigree scrolls.', 'Filigree drawn by hand into scrollwork, then assembled over a frame so the whole kada weighs far less than it looks.',
   '[["Metal", "21K yellow gold"], ["Weight", "Approx. 32 g"], ["Width", "22 mm"], ["Finish", "Hand drawn filigree"]]'::jsonb,
   'assets/products/sitara.webp', 18),
  ('sahr', 'Sahr 21K Gold Coin Pendant', 'necklace', 'investment', 'pendants', null,
   ARRAY['gold21']::text[], ARRAY['Coin motif']::text[],
   'A decorative gold coin pendant framed in a rope-edge 21K gold bezel.', 'A decorative coin motif sits within a rope-edge 21K gold bezel, finished to wear as an everyday pendant or a thoughtful gift.',
   '[["Metal", "21K yellow gold"], ["Detail", "Rope-edge bezel"], ["Finish", "High polish"], ["Chain", "Optional"]]'::jsonb,
   'assets/products/sahr.webp', 19),
  ('nazm', 'Nazm Pearl Drop Earrings', 'earrings', 'gifting', 'earrings', null,
   ARRAY['gold21']::text[], ARRAY['South Sea Pearl']::text[],
   'South Sea pearl drops swinging from hammered gold hoops.', 'Hoops hammered to a soft irregular surface, with South Sea pearls hung so they catch the light when the wearer turns.',
   '[["Metal", "21K yellow gold"], ["Pearls", "South Sea drops"], ["Finish", "Hand hammered"], ["Fitting", "Hook"]]'::jsonb,
   'assets/products/nazm.webp', 20),
  ('maahru', 'Maahru Diamond Bangle', 'bangles', 'bridal', 'bangles', null,
   ARRAY['gold21']::text[], ARRAY['IGI Certified', 'Formal']::text[],
   'A formal 21K gold bangle with channel-set diamonds.', 'A single formal bangle: channel-set stones framed by 21K gold that protects the line for daily wear.',
   '[["Metal", "21K yellow gold"], ["Stones", "Channel-set diamonds"], ["Width", "8 mm"], ["Sizing", "Made to size"]]'::jsonb,
   'assets/products/maahru.webp', 21)
on conflict (id) do nothing;

-- =============================================================================
-- Done. Now add yourself:
--
--   insert into public.admin_emails(email) values ('you@example.com');
--
-- then open admin.html and sign in with that address.
-- =============================================================================
