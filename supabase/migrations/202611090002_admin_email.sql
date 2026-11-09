-- Admin allow-list — owner account (2026-11-09)
-- Project: wqxodgwgmbmssalapcjz (alif-laam-meem-jewellers)
-- Paste into: Supabase Dashboard -> project wqxodgwgmbmssalapcjz -> SQL Editor -> New query -> Run.
--
-- Adds the owner's Google address to the admin allow-list. Safe to re-run.
-- Every policy in the database asks public.is_admin(), which reads this table,
-- and is_admin() additionally requires the signed-in account to have a
-- confirmed email — so sign in once and confirm the address before the panel
-- unlocks.
begin;

insert into public.admin_emails (email, note)
values ('d45671041@gmail.com', 'Owner admin account')
on conflict (email) do update set note = excluded.note;

-- Keep exactly one owner. Uncomment to drop any other addresses:
-- delete from public.admin_emails where lower(email) <> 'd45671041@gmail.com';

commit;

-- Check the result:
--   select email, note, created_at from public.admin_emails;
