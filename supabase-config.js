/* ==========================================================================
   Shared Supabase configuration.

   One file, one project: the same credentials signup.html already uses, so
   customer accounts, appointments, the catalogue and the admin panel all talk
   to the same database.

   The key below is the public (anon) key. It is meant to ship to the browser —
   it grants nothing on its own. Everything it can reach is decided by the row
   level security policies in supabase/schema.sql.
   ========================================================================== */

export const SUPABASE_URL = 'https://eafqpwwpwzjdrkrtoqlz.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_zoi5AWHlAjPn6bx8QOfrPQ_v8vXIHzT';

/* Bootstrap admin list. Leave empty in normal use.

   This is a fallback ONLY, used when the database setup has not been run yet
   and public.is_admin() does not exist. Once supabase/schema.sql has been run,
   the allow-list lives in the public.admin_emails table and this is ignored —
   keep the real list in one place, the database, where row level security can
   enforce it. */
export const ADMIN_EMAILS = [
  // 'you@example.com',
];
