/* Pure helpers for the one-off data move from the old Supabase project into the
   current one. Kept free of DOM and network code so it can be unit tested. */

/* Column lists mirror supabase/schema.sql. Generated columns are deliberately
   absent: `in_stock` is computed by Postgres and cannot be written. */
export const TABLES = [
  {
    key: 'pieces',
    label: 'Catalogue pieces',
    rpc: 'get_admin_pieces',
    conflict: 'id',
    columns: ['id', 'name', 'type', 'occasion', 'motif', 'badge', 'metals', 'tags',
      'description', 'story', 'specs', 'photo', 'sort_order', 'visible', 'featured',
      'updated_at', 'sku', 'track_stock', 'stock_quantity', 'low_stock_threshold',
      'price', 'cost_price', 'weight_grams', 'location'],
    note: 'Inventory edits, price and stock created in the old panel.'
  },
  {
    key: 'appointments',
    label: 'Appointments',
    conflict: 'id',
    columns: ['id', 'name', 'phone', 'email', 'purpose', 'preferred_date', 'preferred_time',
      'notes', 'status', 'source', 'created_at', 'updated_at'],
    note: 'Every booking request and its status.'
  },
  {
    key: 'customers',
    label: 'Customer records',
    conflict: 'id',
    columns: ['id', 'full_name', 'email', 'phone', 'address', 'notes', 'created_at', 'updated_at'],
    note: 'Private records you added by hand in the panel.'
  },
  {
    key: 'posts',
    label: 'Journal posts',
    conflict: 'id',
    columns: ['id', 'title', 'slug', 'category', 'excerpt', 'body', 'image_url', 'status',
      'published_at', 'created_at', 'updated_at'],
    note: 'Drafts and published house journal entries.'
  },
  {
    key: 'alm_reviews',
    label: 'Customer reviews',
    conflict: 'id',
    columns: ['id', 'name', 'city', 'rating', 'body', 'approved', 'created_at'],
    note: 'Approved and pending reviews, filled in readable HTML.'
  }
];

/* Accounts live in auth.users and cannot be copied with the anon key, so a
   profile for an unknown account would violate the foreign key. Profiles are
   therefore matched to accounts that already exist in the new project. */
export const PROFILE_COLUMNS = ['email', 'full_name', 'phone'];

export function chunk(list, size = 100) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/* Keep only the columns the destination table accepts, and drop undefined /
   null-free noise so PostgREST never sees a field it cannot write. */
export function pickColumns(columns, row) {
  const out = {};
  for (const column of columns) {
    if (Object.prototype.hasOwnProperty.call(row, column) && row[column] !== undefined) {
      out[column] = row[column];
    }
  }
  return out;
}

export function prepare(columns, rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows || []) {
    if (!row || typeof row !== 'object') continue;
    const clean = pickColumns(columns, row);
    const key = clean.id != null ? String(clean.id) : null;
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(clean);
  }
  return out;
}

/* Old profile rows -> the new profile rows that share their email address.
   Anything left over belongs to an account that has not signed up again yet. */
export function matchProfiles(oldProfiles, newProfiles) {
  const byEmail = new Map();
  for (const profile of newProfiles || []) {
    const email = String(profile.email || '').trim().toLowerCase();
    if (email) byEmail.set(email, profile);
  }
  const matched = [];
  const unmatched = [];
  for (const profile of oldProfiles || []) {
    const email = String(profile.email || '').trim().toLowerCase();
    const target = email ? byEmail.get(email) : null;
    if (target) matched.push({ email, from: profile, to: target });
    else unmatched.push({ email: email || '(no email)', full_name: profile.full_name || '' });
  }
  return { matched, unmatched };
}

/* Values we would write into an existing profile: only fill blanks, never
   overwrite whatever the person typed themselves in the new project. */
export function profilePatch(from, to) {
  const patch = {};
  const name = String(from.full_name || '').trim();
  const phone = String(from.phone || '').trim();
  if (name && !String(to.full_name || '').trim()) patch.full_name = name;
  if (phone && !String(to.phone || '').trim()) patch.phone = phone;
  return patch;
}

/* Images hosted in the old Supabase storage bucket would 404 once that project
   is retired. Surface them so they can be re-uploaded. */
export function externalImages(baseUrl, rows) {
  const host = (() => { try { return new URL(baseUrl).host; } catch { return ''; } })();
  const seen = new Set();
  const out = [];
  for (const row of rows || []) {
    const value = row && (row.image_url || row.photo);
    if (typeof value !== 'string') continue;
    if (!/^https?:/i.test(value)) continue;
    if (host && value.includes(host)) { if (!seen.has(value)) { seen.add(value); out.push(value); } }
  }
  return out;
}

export function summarise(counts) {
  let total = 0;
  let written = 0;
  let failed = 0;
  for (const entry of counts || []) {
    total += entry.total || 0;
    written += entry.written || 0;
    failed += (entry.failed || []).length;
  }
  return { total, written, failed };
}
