import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/202610290001_stock_customers_posts.sql', import.meta.url), 'utf8');
const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');

test('customer records and posts are protected by admin RLS', () => {
  for (const sql of [migration, schema]) {
    assert.match(sql, /alter table public\.customers enable row level security/);
    assert.match(sql, /alter table public\.posts enable row level security/);
    assert.match(sql, /create policy customers_admin_all on public\.customers[\s\S]*using \(public\.is_admin\(\)\) with check \(public\.is_admin\(\)\)/);
    assert.match(sql, /create policy posts_admin_all on public\.posts[\s\S]*using \(public\.is_admin\(\)\) with check \(public\.is_admin\(\)\)/);
  }
});

test('the public can read only published, due posts', () => {
  for (const sql of [migration, schema]) {
    assert.match(sql, /create policy posts_public_read on public\.posts[\s\S]*using \(status = 'published' and published_at <= now\(\)\)/);
  }
});

test('public piece grants exclude private inventory columns', () => {
  for (const sql of [migration, schema]) {
    assert.match(sql, /revoke select on public\.pieces from public, anon, authenticated/);
    const grant = sql.match(/grant select \(([^)]*)\)\s*on public\.pieces to anon, authenticated/);
    assert.ok(grant, 'column-level SELECT grant exists');
    for (const privateColumn of ['cost_price', 'sku', 'stock_quantity', 'low_stock_threshold', 'location', 'track_stock']) {
      assert.ok(!grant[1].includes(privateColumn), privateColumn + ' is not public');
    }
    assert.match(sql, /create or replace function public\.get_admin_pieces\(\)[\s\S]*security definer[\s\S]*where public\.is_admin\(\)/);
    assert.match(sql, /create or replace view public\.catalogue with \(security_invoker = true\)[\s\S]*from public\.pieces where visible/);
  }
});

test('full schema embeds the additive migration and has no placeholders', () => {
  const body = migration.split('begin;')[1].split('commit;')[0].trim();
  assert.ok(schema.includes(body), 'schema.sql contains the migration body');
  assert.ok(!schema.includes('placeholder'));
  assert.ok(!migration.includes('placeholder'));
});

const hardening = readFileSync(new URL('../supabase/migrations/202611060001_admin_and_booking_hardening.sql', import.meta.url), 'utf8');
const buildPy = readFileSync(new URL('../build.py', import.meta.url), 'utf8');

test('is_admin requires a confirmed account whose email is on the allow-list', () => {
  assert.match(hardening, /join auth\.users u on lower\(u\.email\) = lower\(a\.email\)/);
  assert.match(hardening, /u\.id = auth\.uid\(\)/);
  assert.match(hardening, /email_confirmed_at is not null/);
});

test('website bookings are validated and rate limited server-side', () => {
  assert.match(hardening, /grant insert \(name, phone, email, purpose, preferred_date, preferred_time, notes, source\)\s+on public\.appointments to anon/);
  assert.match(hardening, /revoke select, update, delete/);
  assert.match(hardening, /cf-connecting-ip/);
  assert.match(hardening, /Too many booking requests/);
  assert.match(hardening, /alter table public\.alm_appointment_rate enable row level security/);
});

test('every purpose on the booking form is accepted by the database', () => {
  const block = buildPy.match(/<select id="purpose"[\s\S]*?<\/select>/)[0];
  const labels = [...block.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)]
    .map((m) => m[2].replace(/&amp;/g, '&'));
  assert.ok(labels.length >= 8);
  for (const label of labels) assert.ok(hardening.includes("'" + label + "'"), 'migration accepts purpose: ' + label);
  const times = [...buildPy.match(/<select id="time"[\s\S]*?<\/select>/)[0].matchAll(/<option value="(\d\d:\d\d)">/g)].map((m) => m[1]);
  for (const time of times) assert.ok(hardening.includes("'" + time + "'"), 'migration accepts time: ' + time);
});
