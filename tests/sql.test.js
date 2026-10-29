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
