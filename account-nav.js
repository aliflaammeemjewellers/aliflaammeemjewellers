/* Sign in / Sign out link in the navigation bar.
   Reads the stored Supabase session without loading the Supabase library,
   so ordinary pages stay light. The library is loaded only to sign out. */
import { SUPABASE_URL } from './supabase-config.js';

/* supabase-js stores the session under sb-<project-ref>-auth-token. Deriving it
   from the shared config keeps this file correct when the project changes. */
const KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

function storedUser() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    const session = s.currentSession || s;
    if (!session || !session.user) return null;
    if (session.expires_at && session.expires_at * 1000 < Date.now() && !session.refresh_token) return null;
    return session.user;
  } catch { return null; }
}

const link = document.getElementById('navAccount');
const user = storedUser();
if (link && user) {
  const name = (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || '';
  link.textContent = 'Sign out';
  link.href = '#';
  if (name) link.title = 'Signed in as ' + name;
  link.addEventListener('click', async (event) => {
    event.preventDefault();
    link.textContent = 'Signing out…';
    try {
      const { createClient } = await import('./vendor/supabase.js');
      const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('./supabase-config.js');
      await createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.signOut();
    } catch { localStorage.removeItem(KEY); }
    window.location.reload();
  });
}
