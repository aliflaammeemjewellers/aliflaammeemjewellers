-- Least privilege for the public roles (2026-11-09)
-- Project: wqxodgwgmbmssalapcjz (alif-laam-meem-jewellers)
-- Paste into: Supabase Dashboard -> SQL Editor -> New query -> Run.
--
-- Supabase grants `anon` and `authenticated` broad table privileges by default
-- on anything created in `public`. Row level security still decides which rows
-- they see, but TRUNCATE is not covered by RLS at all, and REFERENCES / TRIGGER
-- have no business belonging to a browser session. This removes everything the
-- site does not actually use, so the grants match the design:
--
--   anon            SELECT on catalogue, posts, alm_reviews and public pieces
--                   columns; INSERT only the booking and review form columns
--   authenticated   the same, plus the admin writes behind is_admin()
--   admin_emails    no API role at all — is_admin() reads it SECURITY DEFINER
--
-- Additive to access, subtractive to grants. Safe to re-run.
begin;

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

revoke all on public.admin_emails from anon, authenticated;

-- The storefront never writes the catalogue; only signed-in admins do.
revoke insert, update, delete, truncate on public.pieces from anon;

-- Profiles are created by the signup trigger and edited by their owner,
-- never inserted or deleted through the API.
revoke all on public.profiles from anon;
revoke insert, delete, truncate, references, trigger on public.profiles from authenticated;

commit;

-- Verify (expect no TRUNCATE anywhere, and nothing on admin_emails):
--   select table_name, grantee, string_agg(distinct privilege_type, ', ' order by privilege_type)
--   from information_schema.role_table_grants
--   where table_schema = 'public' and grantee in ('anon', 'authenticated')
--   group by table_name, grantee order by table_name, grantee;
