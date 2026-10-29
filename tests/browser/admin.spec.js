import { test, expect } from '@playwright/test';

// Never let tests talk to the real Supabase project.
test.beforeEach(async ({ page }) => {
  await page.route('**/*.supabase.co/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
});

async function enterSample(page) {
  await page.goto('/admin.html');
  await page.getByRole('button', { name: /Explore the sample workspace/ }).click();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
}

test('sample stock can be added, adjusted, searched and deleted', async ({ page }) => {
  await enterSample(page);
  await page.getByRole('button', { name: 'Stock & catalogue' }).click();
  await page.getByRole('button', { name: '+ Add stock' }).click();
  await page.getByLabel('Name *').fill('Test Gold Ring');
  await page.getByLabel('SKU', { exact: true }).fill('ALM-TEST-001');
  await page.getByLabel('Track stock quantity for this piece').check();
  await page.getByLabel('Quantity on hand').fill('5');
  await page.getByLabel('Selling price (PKR)').fill('250000');
  await page.getByRole('button', { name: 'Add piece', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('Search stock').fill('Test Gold Ring');
  await expect(page.locator('#pieceBody, .admin-stock-table tbody')).toContainText('Test Gold Ring');
  await page.getByRole('button', { name: 'Increase Test Gold Ring quantity' }).click();
  await expect(page.locator('.admin-stock-table tbody')).toContainText('6');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete piece', exact: true }).click();
  await expect(page.locator('.admin-stock-table tbody')).toContainText('No pieces match');
});

test('customer records validate, save and persist in the preview', async ({ page }) => {
  await enterSample(page);
  await page.getByRole('button', { name: 'Customers', exact: true }).click();
  await page.getByRole('button', { name: '+ Add customer' }).click();
  await page.getByLabel('Full name *').fill('No Contact');
  await page.getByRole('button', { name: 'Add customer', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('email address or phone');
  await page.getByLabel('Phone number').fill('+92 300 1234567');
  await page.getByLabel('Private notes').fill('Prefers evening appointments.');
  await page.getByRole('button', { name: 'Add customer', exact: true }).click();
  await expect(page.locator('.admin-table tbody').first()).toContainText('No Contact');
  await page.reload();
  await page.getByRole('button', { name: 'Customers', exact: true }).click();
  await expect(page.locator('.admin-table tbody').first()).toContainText('No Contact');
});

test('posts save as private drafts and publish explicitly', async ({ page }) => {
  await enterSample(page);
  await page.getByRole('button', { name: 'Posts', exact: true }).click();
  await page.getByRole('button', { name: '+ New post' }).click();
  await page.getByLabel('Title *').fill('A test story');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('.admin-posts-table tbody')).toContainText('Draft');
  const row = page.locator('.admin-posts-table tbody tr').filter({ hasText: 'A test story' });
  await row.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.locator('#toast')).toContainText('write its content before publishing');
  await row.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Post content').fill('Hello from the house.');
  await page.getByRole('button', { name: 'Publish post', exact: true }).click();
  await expect(page.locator('.admin-posts-table tbody tr').filter({ hasText: 'A test story' })).toContainText('Published');
});

test('mobile admin has no page-level horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterSample(page);
  for (const tab of ['Stock & catalogue', 'Customers', 'Posts', 'Appointments']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
  }
});

test('public journal renders published posts from mocked API safely', async ({ page }) => {
  await page.route('**/rest/v1/posts?**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
    id: 'p1', title: '<img src=x onerror=alert(1)>', slug: 'safe-story', category: 'news', excerpt: 'A safe summary',
    body: 'Hello from the house.', image_url: '', published_at: '2026-10-28T10:00:00Z'
  }]) }));
  await page.goto('/journal.html');
  await expect(page.locator('.journal-card h2')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('.journal-card img')).toHaveCount(0);
  await page.locator('.journal-card-link').click();
  await expect(page.locator('.journal-article h1')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('.journal-body')).toHaveText('Hello from the house.');
});

test('real admin mode keeps a failed customer save in the editor', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sb-eafqpwwpwzjdrkrtoqlz-auth-token', JSON.stringify({
      access_token: 'test-token', token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'test-refresh',
      user: { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'admin@example.com' }
    }));
  });
  await page.route('**/rest/v1/**', route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/rpc/is_admin')) return route.fulfill({ status: 200, contentType: 'application/json', body: 'true' });
    if (path.endsWith('/rpc/get_admin_pieces')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (path.endsWith('/customers') && request.method() === 'POST') return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ code: '23505', message: 'duplicate key value violates unique constraint' }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.goto('/admin.html');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Customers', exact: true }).click();
  await page.getByRole('button', { name: '+ Add customer' }).click();
  await page.getByLabel('Full name *').fill('Duplicate Customer');
  await page.getByRole('dialog').getByLabel('Email address', { exact: true }).fill('duplicate@example.com');
  await page.getByRole('button', { name: 'Add customer', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('already in use');
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('a newly added piece has a working public detail page and availability note', async ({ page }) => {
  await page.route('**/rest/v1/catalogue?**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{
    id: 'test-ring', name: 'Test Gold Ring', type: 'rings', occasion: 'everyday', motif: 'rings', badge: '',
    metals: ['gold21'], tags: ['21K'], description: 'A test piece.', story: 'A longer test story.',
    specs: [['Metal', '21K gold']], photo: null, sort_order: 0, visible: true, featured: false, in_stock: false
  }]) }));
  await page.goto('/piece.html?id=test-ring');
  await expect(page.locator('.piece-name')).toHaveText('Test Gold Ring');
  await expect(page.locator('.piece-note')).toContainText('currently unavailable');
  await expect(page.locator('[data-enquire]')).toHaveText('Ask about availability');
});

test('an empty live catalogue removes stale generated cards', async ({ page }) => {
  await page.route('**/rest/v1/catalogue?**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.goto('/collections.html');
  await expect(page.locator('#productsGrid .product-card')).toHaveCount(0);
  await expect(page.locator('#noResults')).toBeVisible();
  await expect(page.locator('#spotlight')).toBeHidden();
});
