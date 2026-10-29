/* Pure validation and formatting shared by the panel and its tests.
   No browser globals, network requests or database credentials live here. */
export const POST_CATEGORIES = {
  news: 'House news',
  'new-arrivals': 'New arrivals',
  offers: 'Offers',
  'jewellery-care': 'Jewellery care'
};

export const slugify = (value) => String(value || '').normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90).replace(/-+$/g, '');

export function safeImage(value) {
  const src = String(value || '').trim();
  if (!src) return '';
  if (/^assets\/[a-zA-Z0-9_./-]+$/.test(src) && !src.split('/').includes('..')) return src;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export const money = (value) => value == null || value === '' ? 'Not set' :
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(Number(value));

export function stockLevel(piece) {
  if (piece.visible === false) return { key: 'hidden', label: 'Hidden', tone: 'neutral' };
  if (!piece.track_stock) return { key: 'untracked', label: 'Not tracked', tone: 'neutral' };
  const quantity = Number(piece.stock_quantity || 0);
  if (quantity <= 0) return { key: 'out', label: 'Out of stock', tone: 'danger' };
  if (quantity <= Number(piece.low_stock_threshold ?? 2)) return { key: 'low', label: 'Low stock', tone: 'warning' };
  return { key: 'in', label: 'In stock', tone: 'success' };
}

function nonnegative(value, label, integer = false, nullable = false) {
  if (nullable && String(value ?? '').trim() === '') return { value: null };
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || (integer && !Number.isInteger(number)) || number > 1000000000) {
    return { error: `${label} must be a non-negative ${integer ? 'whole number' : 'number'} up to 1,000,000,000.` };
  }
  return { value: number };
}

export function validateStock(input) {
  const name = String(input.name || '').trim();
  const id = String(input.id || '').trim();
  if (!name || name.length > 160) return { error: 'Enter a piece name of 1–160 characters.' };
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)) return { error: 'Use a lowercase URL ID with letters, numbers and dashes only (up to 80 characters).' };
  if (input.photo && !safeImage(input.photo)) return { error: 'Use an HTTPS image URL or a path inside assets/.' };
  const fields = {};
  for (const [key, label, integer, nullable] of [
    ['stock_quantity', 'Quantity', true, false],
    ['low_stock_threshold', 'Low-stock alert', true, false],
    ['price', 'Selling price', false, true],
    ['cost_price', 'Cost price', false, true],
    ['weight_grams', 'Weight', false, true]
  ]) {
    const result = nonnegative(input[key], label, integer, nullable);
    if (result.error) return result;
    fields[key] = result.value;
  }
  return { value: {
    name, id, sku: String(input.sku || '').trim().toUpperCase() || null,
    ...fields, track_stock: !!input.track_stock,
    location: String(input.location || '').trim() || null
  } };
}

export function validateCustomer(input) {
  const full_name = String(input.full_name || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  const phone = String(input.phone || '').trim();
  if (!full_name || full_name.length > 120) return { error: 'Enter a customer name of 1–120 characters.' };
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return { error: 'Enter a valid email address, or leave it blank.' };
  if (phone && !/^[+\d\s().-]{7,30}$/.test(phone)) return { error: 'Enter a valid phone number, including the country code.' };
  if (!email && !phone) return { error: 'Add an email address or phone number so you can contact this customer.' };
  if (String(input.notes || '').length > 5000) return { error: 'Keep customer notes under 5,000 characters.' };
  return { value: {
    full_name, email: email || null, phone: phone || null,
    address: String(input.address || '').trim() || null,
    notes: String(input.notes || '').trim() || null
  } };
}

export function validatePost(input, publishing = false) {
  const title = String(input.title || '').trim();
  const body = String(input.body || '').trim();
  const slug = String(input.slug || '').trim();
  if (!title || title.length > 160) return { error: 'Enter a title of 1–160 characters.' };
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(slug)) return { error: 'Use a lowercase URL slug with letters, numbers and dashes only.' };
  if (!Object.hasOwn(POST_CATEGORIES, input.category)) return { error: 'Choose a post category.' };
  if (publishing && !body) return { error: 'Write the post before publishing it.' };
  if (body.length > 30000 || String(input.excerpt || '').length > 320) return { error: 'Keep the post under 30,000 characters and its summary under 320 characters.' };
  if (input.image_url && !safeImage(input.image_url)) return { error: 'Use an HTTPS image URL or a path inside assets/.' };
  return { value: {
    title, slug, body, category: input.category,
    excerpt: String(input.excerpt || '').trim() || null,
    image_url: safeImage(input.image_url) || null
  } };
}

export function toCsv(rows, columns) {
  const cell = (value) => {
    let text = String(value ?? '');
    // Spreadsheet formula injection protection for customer-controlled fields.
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  return '\uFEFF' + [columns.map((c) => cell(c.label)).join(','),
    ...rows.map((row) => columns.map((c) => cell(c.value(row))).join(','))].join('\r\n');
}

export function samplePosts(now = Date.now()) {
  return [
    { id: 'sample-post-1', title: 'A new chapter in gold', slug: 'a-new-chapter-in-gold', category: 'new-arrivals',
      excerpt: 'A first look at the pieces joining our collection this season.',
      body: 'Some pieces begin with a stone. Others begin with a story.\n\nOur latest collection brings together hand-worked gold, considered details and shapes made to become part of your everyday life. Explore the collection online, or join us at the showroom for a closer look.',
      image_url: 'assets/products/meher.webp', status: 'published', published_at: new Date(now - 86400000).toISOString(), created_at: new Date(now - 86400000).toISOString(), updated_at: new Date(now - 86400000).toISOString() },
    { id: 'sample-post-2', title: 'Care for the pieces you love', slug: 'care-for-the-pieces-you-love', category: 'jewellery-care',
      excerpt: 'Simple habits to keep your gold beautiful for years to come.',
      body: 'Store each piece separately in a soft pouch. Put your jewellery on after perfume and hairspray, and remove it before swimming or cleaning.\n\nFor a deeper clean or a professional polish, bring your piece to our team. We will check the settings and finish before returning it to you.',
      image_url: 'assets/products/hina.webp', status: 'draft', published_at: null, created_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() }
  ];
}
