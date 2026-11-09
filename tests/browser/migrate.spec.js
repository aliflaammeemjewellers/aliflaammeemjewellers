import { test, expect } from '@playwright/test';

/* The transfer page is exercised against mocked Supabase endpoints so the test
   never touches either real project. Requests are split by host: the old
   project serves rows, the new one records what it was asked to write. */

const OLD = 'eafqpwwpwzjdrkrtoqlz.supabase.co';
const NEW = 'wqxodgwgmbmssalapcjz.supabase.co';
const user = { id: 'u-1', email: 'd45671041@gmail.com', aud: 'authenticated', role: 'authenticated' };
const session = {
  access_token: 'token', token_type: 'bearer', expires_in: 3600, refresh_token: 'refresh', user
};

const OLD_ROWS = {
  get_admin_pieces: [
    { id: 'meher', name: 'Meher Solitaire Ring', type: 'rings', photo: 'assets/products/meher.webp', price: 250000, stock_quantity: 2, in_stock: true }
  ],
  appointments: [
    { id: 'a-1', name: 'Ayesha', phone: '03001234567', purpose: 'engagement', preferred_date: '2026-11-20', status: 'confirmed' }
  ],
  customers: [{ id: 'c-1', full_name: 'Ayesha Khan', email: 'ayesha@example.com', phone: '03001234567' }],
  posts: [
    { id: 'p-1', title: 'New arrivals', slug: 'new-arrivals', category: 'news', body: 'Gold.', status: 'published', published_at: '2026-11-01T00:00:00Z',
      image_url: 'https://eafqpwwpwzjdrkrtoqlz.supabase.co/storage/v1/object/public/posts/a.jpg' }
  ],
  alm_reviews: [{ id: 'r-1', name: 'Sana', rating: 5, body: 'Beautiful work, thank you.', approved: true }],
  profiles: [{ id: 'u-old', email: 'ayesha@example.com', full_name: 'Ayesha Khan', phone: '03001234567' }]
};

const written = [];

test.beforeEach(async ({ page }) => {
  await page.route('**/*.supabase.co/**', async (route) => {
    const url = new URL(route.request().url());
    const host = url.host;
    const path = url.pathname;
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (path === '/auth/v1/token') return json(session);
    if (path === '/auth/v1/user') return json(user);
    if (path === '/auth/v1/logout') return json({});
    if (path === '/rest/v1/rpc/is_admin') return json(true);

    if (host === OLD) {
      if (path === '/rest/v1/rpc/get_admin_pieces') return json(OLD_ROWS.get_admin_pieces);
      const table = path.replace('/rest/v1/', '');
      if (Object.prototype.hasOwnProperty.call(OLD_ROWS, table)) return json(OLD_ROWS[table]);
      return json([]);
    }

    if (host === NEW) {
      const table = path.replace('/rest/v1/', '');
      if (route.request().method() === 'GET') {
        if (table === 'profiles') return json([{ id: 'u-new', email: 'ayesha@example.com', full_name: '', phone: '' }]);
        return json([]);
      }
      written.push({ table, body: route.request().postDataJSON() });
      return json(null, 201);
    }

    return json({}, 404);
  });
});

test('both admins sign in, then the old rows land in the new project', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/migrate.html');
  await expect(page.getByRole('heading', { name: 'Move your data into the current database' })).toBeVisible();
  await expect(page.locator('input[data-table]')).toHaveCount(5);
  await expect(page.locator('#runBtn')).toBeDisabled();

  await page.getByLabel('Admin email').first().fill('owner@old.example');
  await page.getByLabel('Password').first().fill('secret123');
  await page.locator('#oldForm').getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('#oldStatus')).toContainText('admin confirmed');
  await expect(page.locator('#oldDot')).toHaveClass(/ok/);

  await page.locator('#newPassword').fill('secret123');
  await page.locator('#newForm').getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('#newStatus')).toContainText('admin confirmed');

  await expect(page.locator('#runBtn')).toBeEnabled();
  await page.locator('#previewBtn').click();
  await expect(page.locator('em[data-count="appointments"]')).toContainText('1 rows');
  await expect(page.locator('em[data-count="alm_reviews"]')).toContainText('1 rows');

  await page.locator('#runBtn').click();
  await expect(page.locator('#resultCard')).toBeVisible();
  await expect(page.locator('#resultSummary')).toContainText('Nothing left behind');

  const tables = written.map((entry) => entry.table);
  for (const table of ['pieces', 'appointments', 'customers', 'posts', 'alm_reviews']) {
    expect(tables, `missing write for ${table}`).toContain(table);
  }

  const appointment = written.find((entry) => entry.table === 'appointments').body[0];
  expect(appointment).toMatchObject({ id: 'a-1', status: 'confirmed' });
  const piece = written.find((entry) => entry.table === 'pieces').body[0];
  expect(piece).toMatchObject({ id: 'meher', price: 250000, stock_quantity: 2 });
  expect(piece).not.toHaveProperty('in_stock');

  // Photos that still live on the old project are surfaced, not silently copied.
  await expect(page.locator('#imageBlock')).toBeVisible();
  await expect(page.locator('#imageList')).toContainText('eafqpwwpwzjdrkrtoqlz.supabase.co/storage');
  // The old account exists in the new project, so it is patched, not listed.
  await expect(page.locator('#accountBlock')).toBeHidden();
  expect(errors).toEqual([]);
});

test('an unfinished account is reported instead of breaking the transfer', async ({ page }) => {
  await page.route('**/*.supabase.co/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.host === NEW && url.pathname === '/rest/v1/profiles' && route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    return route.fallback();
  });

  await page.goto('/migrate.html');
  await page.getByLabel('Admin email').first().fill('owner@old.example');
  await page.getByLabel('Password').first().fill('secret123');
  await page.locator('#oldForm').getByRole('button', { name: 'Sign in' }).click();
  await page.locator('#newPassword').fill('secret123');
  await page.locator('#newForm').getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('#runBtn')).toBeEnabled();

  await page.locator('#runBtn').click();
  await expect(page.locator('#accountBlock')).toBeVisible();
  await expect(page.locator('#accountList')).toContainText('ayesha@example.com');
});
