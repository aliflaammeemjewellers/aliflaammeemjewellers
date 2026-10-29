import test from 'node:test';
import assert from 'node:assert/strict';
import { slugify, safeImage, stockLevel, validateStock, validateCustomer, validatePost, toCsv, money } from '../admin-model.js';

test('slugify makes stable URL ids', () => {
  assert.equal(slugify('  Meher Solitaire Ring!  '), 'meher-solitaire-ring');
  assert.equal(slugify('Éclat – 21K Gold'), 'eclat-21k-gold');
});

test('safeImage allows asset paths and HTTPS only', () => {
  assert.equal(safeImage('assets/products/meher.webp'), 'assets/products/meher.webp');
  assert.equal(safeImage('https://example.com/a.jpg'), 'https://example.com/a.jpg');
  assert.equal(safeImage('javascript:alert(1)'), '');
  assert.equal(safeImage('assets/../secret'), '');
  assert.equal(safeImage('http://example.com/a.jpg'), '');
});

test('stock levels distinguish untracked, low, out and hidden', () => {
  assert.equal(stockLevel({ track_stock: false }).key, 'untracked');
  assert.equal(stockLevel({ track_stock: true, stock_quantity: 0 }).key, 'out');
  assert.equal(stockLevel({ track_stock: true, stock_quantity: 2, low_stock_threshold: 2 }).key, 'low');
  assert.equal(stockLevel({ track_stock: true, stock_quantity: 3, low_stock_threshold: 2 }).key, 'in');
  assert.equal(stockLevel({ visible: false, track_stock: true, stock_quantity: 3 }).key, 'hidden');
});

const stock = { id: 'test-ring', name: 'Test Ring', stock_quantity: 3, low_stock_threshold: 2, price: '', cost_price: '', weight_grams: '', track_stock: true };
test('stock validation accepts empty optional money and normalizes SKU', () => {
  const result = validateStock({ ...stock, sku: ' alm-001 ' });
  assert.equal(result.value.sku, 'ALM-001');
  assert.equal(result.value.price, null);
});
test('stock validation rejects negative and fractional quantities', () => {
  assert.match(validateStock({ ...stock, stock_quantity: -1 }).error, /Quantity/);
  assert.match(validateStock({ ...stock, stock_quantity: 1.5 }).error, /whole number/);
});

test('customer requires a contact method and normalizes email', () => {
  assert.match(validateCustomer({ full_name: 'Ayesha' }).error, /email address or phone/);
  const result = validateCustomer({ full_name: ' Ayesha ', email: 'AYESHA@EXAMPLE.COM', phone: '+92 300 1234567' });
  assert.equal(result.value.full_name, 'Ayesha');
  assert.equal(result.value.email, 'ayesha@example.com');
});

test('posts can be empty drafts but publishing needs content', () => {
  const draft = { title: 'News', slug: 'news', category: 'news', body: '' };
  assert.ok(validatePost(draft, false).value);
  assert.match(validatePost(draft, true).error, /before publishing/);
  assert.ok(validatePost({ ...draft, body: 'Hello' }, true).value);
});

test('CSV escapes quotes and blocks spreadsheet formulas', () => {
  const csv = toCsv([{ name: '=HYPERLINK("x")', note: 'a,b' }], [{ label: 'Name', value: r => r.name }, { label: 'Note', value: r => r.note }]);
  assert.ok(csv.includes('"\'=HYPERLINK(""x"")"'));
  assert.ok(csv.includes('"a,b"'));
});

test('money formats PKR', () => {
  assert.match(money(185000), /185,000/);
  assert.equal(money(null), 'Not set');
});
