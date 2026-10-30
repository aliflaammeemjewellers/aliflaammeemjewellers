/* Alif Laam Meem Jewellers — private shop workspace.
   Supabase RLS is the access boundary; this interface never holds a service key.
   Sample mode is isolated to sessionStorage and never writes to the database. */
import { createClient } from './vendor/supabase.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAILS } from './supabase-config.js';
import { $, el, clear, field, input, textarea, select, formError, saving, toast,
  openModal, confirmModal, detailRow, download, formatDate, formatDateTime, ago,
  isMissingRelation, databaseError, missingCard, errorCard, statusPill } from './admin-ui.js';
import { money, stockLevel, validateStock, slugify, safeImage, toCsv, samplePosts } from './admin-model.js';
import { renderCustomers, renderPosts, openCustomerEditor, openPostEditor } from './admin-records.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const METALS = { gold21: '21K Gold' };
const TYPES = { rings: 'Rings', necklace: 'Necklaces', earrings: 'Earrings', bangles: 'Bangles', bridal: 'Bridal Sets' };
const OCCASIONS = { bridal: 'Bridal', engagement: 'Engagement', festive: 'Festive', everyday: 'Everyday', gifting: 'Gifting', investment: 'Investment' };
const MOTIFS = ['rings', 'necklace', 'pendants', 'earrings', 'bangles', 'bridal'];
const STATUSES = ['new', 'confirmed', 'completed', 'cancelled'];
const SAMPLE_KEY = 'alm-admin-preview-v1';
const HEADINGS = {
  overview: ['Overview', 'A little clarity for your everyday. Your shop, at a glance.'],
  appointments: ['Appointments', 'Every viewing, consultation and conversation starts here.'],
  catalogue: ['Stock & catalogue', 'Manage your pieces, keep quantities in step and choose what the world sees.'],
  customers: ['Customers', 'Remember the person behind every piece.'],
  posts: ['Posts', 'New arrivals, house news and stories worth sharing.']
};
const state = {
  user: null, isAdmin: false, adminSource: null, tab: 'overview', sample: false,
  appointments: [], pieces: [], customers: [], profiles: [], posts: [], ready: {}, errors: {},
  apptFilter: 'all', apptSearch: '', pieceSearch: '', stockFilter: 'all',
  custSearch: '', profileSearch: '', accountsOpen: false, postSearch: '', postFilter: 'all'
};

function showView(which) {
  $('#adminLoading').hidden = true;
  $('#viewAuth').hidden = which !== 'auth';
  $('#viewApp').hidden = which !== 'app';
  $('#signOutBtn').hidden = which !== 'app';
  $('#signOutBtn').textContent = state.sample ? 'Exit preview' : 'Sign out';
  $('#adminWho').hidden = which !== 'app';
}

function authMessage(message) {
  const node = $('#authMessage');
  node.hidden = !message;
  node.dataset.state = 'error';
  node.textContent = message || '';
}

async function checkAdmin(user) {
  const { data, error } = await supabase.rpc('is_admin');
  if (!error && typeof data === 'boolean') return { ok: data, source: 'database' };
  if (isMissingRelation(error)) {
    const list = (ADMIN_EMAILS || []).map((email) => String(email).toLowerCase());
    return { ok: list.includes(String(user.email || '').toLowerCase()), source: 'local', warning: !list.length };
  }
  return { ok: false, source: 'database', error };
}

async function afterAuth(user) {
  const result = await checkAdmin(user);
  if (!result.ok) {
    await supabase.auth.signOut();
    showView('auth');
    authMessage(result.error ? 'We could not check your permissions: ' + result.error.message
      : 'This account is not on the admin list. Add its email to admin_emails in Supabase. You can still explore the panel with sample data.');
    return;
  }
  state.sample = false;
  sessionStorage.removeItem(SAMPLE_KEY);
  state.user = user;
  state.isAdmin = true;
  state.adminSource = result.source;
  $('#adminWho').textContent = user.email || 'Signed in';
  showView('app');
  await refresh();
}

$('#signInForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = $('#adminEmail').value.trim(), password = $('#adminPassword').value;
  if (!email || !password) { authMessage('Enter your email address and password.'); return; }
  authMessage('');
  await saving($('#signInBtn'), 'Signing in…', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      authMessage(/invalid login/i.test(error?.message || '')
        ? 'Those details do not match an account. Check your email and password, and confirm your email if you have just signed up.'
        : error?.message || 'We could not sign you in. Please try again.');
      return;
    }
    $('#adminPassword').value = '';
    await afterAuth(data.user);
  });
});

$('#googleSignInBtn').addEventListener('click', async () => {
  authMessage('');
  const button = $('#googleSignInBtn');
  button.disabled = true;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: new URL('admin.html', window.location.href).href }
  });
  if (error) { authMessage(error.message || 'Google sign-in is not available right now.'); button.disabled = false; }
});

function resetPrivateState() {
  state.user = null; state.isAdmin = false; state.sample = false; state.adminSource = null;
  state.appointments = []; state.pieces = []; state.customers = []; state.profiles = []; state.posts = [];
  state.ready = {}; state.errors = {}; state.tab = 'overview';
  state.apptSearch = state.pieceSearch = state.custSearch = state.profileSearch = state.postSearch = '';
  document.querySelectorAll('.admin-panel').forEach(clear);
  $('#adminWho').textContent = '';
}

$('#signOutBtn').addEventListener('click', async () => {
  const wasSample = state.sample;
  sessionStorage.removeItem(SAMPLE_KEY);
  resetPrivateState();
  showView('auth');
  if (!wasSample) {
    try { await supabase.auth.signOut(); } catch { /* Local session is already cleared. */ }
  }
  $('#useSampleBtn').focus();
});

/* -------------------------- Isolated preview -------------------------- */
async function samplePieces() {
  let items = [];
  try {
    const response = await fetch('collections.html');
    if (response.ok) {
      const match = (await response.text()).match(/<script type="application\/json" id="catalogue-data">([\s\S]*?)<\/script>/);
      if (match) items = JSON.parse(match[1]).items || [];
    }
  } catch { /* The small fallback below also works without a catalogue fetch. */ }
  if (!items.length) items = [{ id: 'meher', name: 'Meher Solitaire Ring', type: 'rings', occasion: 'engagement', motif: 'rings', desc: 'A brilliant-cut solitaire on a hand-forged 21K gold band.', story: 'Set in a six-claw mount so light reaches the stone from every angle.', photo: 'assets/products/meher.webp', tags: ['BIS Hallmarked'], specs: [['Metal', '21K yellow gold']] }];
  return items.map((item, index) => ({
    id: item.id, name: item.name, type: item.type, occasion: item.occasion, motif: item.motif,
    badge: item.badge || '', metals: ['gold21'], tags: item.tags || [], description: item.desc,
    story: item.story, specs: item.specs || [], photo: item.photo, sort_order: index,
    visible: true, featured: index < 3, sku: 'ALM-' + String(index + 1).padStart(4, '0'),
    track_stock: true, stock_quantity: [4, 2, 1, 0, 3, 6][index % 6], low_stock_threshold: 2,
    price: 185000 + index * 17500, cost_price: 151000 + index * 14000,
    weight_grams: 8.5 + index, location: index % 2 ? 'Display B' : 'Display A', updated_at: new Date().toISOString()
  }));
}

function persistSample() {
  if (!state.sample) return;
  try {
    sessionStorage.setItem(SAMPLE_KEY, JSON.stringify({ version: 1, pieces: state.pieces,
      appointments: state.appointments, customers: state.customers, profiles: state.profiles, posts: state.posts }));
  } catch { toast('This browser could not remember preview changes. They remain available until you reload.', 'warn'); }
}

async function enterSampleMode(restore = false) {
  let saved;
  if (restore) {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(SAMPLE_KEY));
      if (parsed?.version === 1 && ['pieces', 'appointments', 'customers', 'profiles', 'posts'].every((key) => Array.isArray(parsed[key]))) saved = parsed;
    } catch { /* Invalid preview storage is ignored. */ }
  }
  state.sample = true; state.isAdmin = true; state.adminSource = 'sample'; state.user = { email: 'sample@preview' };
  if (saved) {
    for (const key of ['pieces', 'appointments', 'customers', 'profiles', 'posts']) state[key] = saved[key];
  } else {
    state.pieces = await samplePieces();
    const now = Date.now();
    state.posts = samplePosts(now);
    state.customers = [
      { id: 'sample-customer-1', full_name: 'Ayesha Rehman', phone: '+92 300 5550101', email: 'ayesha@example.com', address: 'Lahore', notes: 'Sample record · Interested in bridal sets. Ring size 14.', created_at: new Date(now - 86400000 * 12).toISOString() },
      { id: 'sample-customer-2', full_name: 'Hira Nawaz', phone: '+92 300 5550102', email: 'hira@example.com', address: 'Sharaqpur', notes: 'Sample record · Follow up about an anniversary gift.', created_at: new Date(now - 86400000 * 4).toISOString() }
    ];
    state.profiles = [{ id: 'sample-profile-1', email: 'ayesha@example.com', full_name: 'Ayesha Rehman', is_active: true, created_at: new Date(now - 86400000 * 30).toISOString(), last_sign_in_at: new Date(now - 3600000 * 5).toISOString() }];
    state.appointments = [
      { id: 'sample-appt-1', name: 'Ayesha Rehman', phone: '+92 300 5550101', email: 'ayesha@example.com', purpose: 'Bridal consultation', preferred_date: new Date(now + 86400000 * 2).toISOString().slice(0, 10), preferred_time: '15:00', notes: 'Sample appointment · Would like to see bridal sets.', status: 'new', source: 'sample', created_at: new Date(now - 3600000).toISOString() },
      { id: 'sample-appt-2', name: 'Hira Nawaz', phone: '+92 300 5550102', email: 'hira@example.com', purpose: 'Engagement rings', preferred_date: new Date(now + 86400000 * 3).toISOString().slice(0, 10), preferred_time: '11:00', status: 'confirmed', source: 'sample', created_at: new Date(now - 7200000).toISOString() }
    ];
  }
  state.ready = { appointments: 'sample', pieces: 'sample', customers: 'sample', profiles: 'sample', posts: 'sample' };
  state.errors = {};
  $('#adminWho').textContent = 'Sample workspace';
  showView('app');
  persistSample();
  renderAll();
}
$('#useSampleBtn').addEventListener('click', () => saving($('#useSampleBtn'), 'Opening preview…', () => enterSampleMode()));

/* ----------------------------- Data layer ----------------------------- */
async function loadTable(name, query) {
  try {
    const { data, error } = await query;
    if (error) throw error;
    state.ready[name] = 'ok';
    delete state.errors[name];
    return data || [];
  } catch (error) {
    state.ready[name] = isMissingRelation(error) ? 'missing' : 'error';
    state.errors[name] = error.message || 'The database could not be reached.';
    return [];
  }
}

async function loadAll() {
  if (state.sample) { persistSample(); renderAll(); return; }
  const [appointments, pieces, customers, profiles, posts] = await Promise.all([
    loadTable('appointments', supabase.from('appointments').select('*').order('preferred_date')),
    loadTable('pieces', supabase.rpc('get_admin_pieces')),
    loadTable('customers', supabase.from('customers').select('*').order('created_at', { ascending: false })),
    loadTable('profiles', supabase.from('profiles').select('*').order('created_at', { ascending: false })),
    loadTable('posts', supabase.from('posts').select('*').order('updated_at', { ascending: false }))
  ]);
  Object.assign(state, { appointments, pieces, customers, profiles, posts });
  renderAll();
}

async function refresh() {
  const control = $('#refreshBtn');
  control.disabled = true;
  try { await loadAll(); }
  catch (error) { toast('Could not refresh: ' + error.message, 'error'); }
  finally { control.disabled = false; }
}
$('#refreshBtn').addEventListener('click', refresh);
const ctx = { state, supabase, refresh };

const TABLE_NAMES = { appointments: 'appointments', pieces: 'stock & catalogue', customers: 'customer records', profiles: 'website accounts', posts: 'posts' };
function renderSetupBanner() {
  const banner = $('#setupBanner');
  clear(banner);
  const notices = [];
  if (state.sample) notices.push(['You’re exploring a sample workspace', 'Try adding stock, customers and posts. Changes stay in this browser tab and are never sent to your database. Exit preview to sign in to your real shop.']);
  if (state.adminSource === 'local') notices.push(['Using the local admin allow-list', 'The database permission function is not installed. Run supabase/schema.sql so row level security can enforce access.']);
  const missing = Object.keys(state.ready).filter((key) => state.ready[key] === 'missing');
  if (missing.length) notices.push(['Database setup needed: ' + missing.map((key) => TABLE_NAMES[key]).join(', '),
    'For the existing project, run supabase/migrations/202610290001_stock_customers_posts.sql in its SQL editor, then refresh. For a new project, run supabase/schema.sql first. No live database has been changed by this update.']);
  Object.keys(state.ready).filter((key) => state.ready[key] === 'error').forEach((key) => notices.push(['Could not load ' + TABLE_NAMES[key], state.errors[key]]));
  banner.hidden = !notices.length;
  notices.forEach(([title, body]) => banner.append(el('div', { class: 'admin-notice' }, [
    el('p', { class: 'admin-notice-title', text: title }), el('p', { class: 'admin-notice-body', text: body })
  ])));
}

function navigate(tab) { state.tab = tab; renderAll(); }
$('#adminTabs').addEventListener('click', (event) => {
  const tab = event.target.closest('[data-tab]');
  if (tab) navigate(tab.dataset.tab);
});
$('#adminTabs').addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const tabs = [...document.querySelectorAll('.admin-tab')];
  const index = tabs.indexOf(document.activeElement);
  if (index < 0) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next].focus(); navigate(tabs[next].dataset.tab);
});

function renderAll() {
  renderSetupBanner();
  const [title, subtitle] = HEADINGS[state.tab];
  $('#adminPanelTitle').textContent = title;
  $('#adminPanelSubtitle').textContent = subtitle;
  document.querySelectorAll('.admin-tab').forEach((tab) => {
    const active = tab.dataset.tab === state.tab;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-pressed', active);
  });
  Object.keys(HEADINGS).forEach((name) => { $('#panel' + name[0].toUpperCase() + name.slice(1)).hidden = name !== state.tab; });
  if (state.tab === 'overview') renderOverview();
  if (state.tab === 'appointments') renderAppointments();
  if (state.tab === 'catalogue') renderCatalogue();
  if (state.tab === 'customers') renderCustomers(ctx);
  if (state.tab === 'posts') renderPosts(ctx);
}

/* ------------------------------ Overview ------------------------------ */
function statCard(label, value, note) {
  return el('div', { class: 'admin-stat' }, [
    el('p', { class: 'admin-stat-label', text: label }), el('p', { class: 'admin-stat-value', text: String(value) }),
    el('p', { class: 'admin-stat-note', text: note })
  ]);
}
function renderOverview() {
  const panel = $('#panelOverview');
  clear(panel);
  const low = state.pieces.filter((piece) => ['low', 'out'].includes(stockLevel(piece).key));
  const units = state.pieces.filter((piece) => piece.track_stock).reduce((sum, piece) => sum + piece.stock_quantity, 0);
  const published = state.posts.filter((post) => post.status === 'published').length;
  panel.append(el('div', { class: 'admin-quick-actions' }, [
    el('button', { class: 'admin-btn admin-btn-primary', type: 'button', onclick: () => editPiece(null) }, ['+ Add stock']),
    el('button', { class: 'admin-btn', type: 'button', onclick: () => openCustomerEditor(ctx) }, ['+ Add customer']),
    el('button', { class: 'admin-btn', type: 'button', onclick: () => openPostEditor(ctx) }, ['+ Write a post'])
  ]));
  panel.append(el('div', { class: 'admin-stats' }, [
    statCard('Units in stock', units, state.pieces.filter((piece) => piece.track_stock).length + ' tracked pieces'),
    statCard('Low / out of stock', low.length, 'pieces need attention'),
    statCard('Customer records', state.customers.length, state.profiles.length + ' website accounts'),
    statCard('New requests', state.appointments.filter((row) => row.status === 'new').length, 'awaiting a reply'),
    statCard('Published posts', published, state.posts.length - published + ' drafts'),
    statCard('Catalogue pieces', state.pieces.length, state.pieces.filter((piece) => piece.visible).length + ' visible on the website')
  ]));
  const lowCard = el('section', { class: 'admin-card' }, [
    el('div', { class: 'admin-card-head' }, [el('h2', { class: 'admin-card-title', text: 'Stock needing attention' }),
      el('button', { class: 'admin-btn admin-btn-small admin-btn-quiet', type: 'button', onclick: () => { state.stockFilter = 'low'; navigate('catalogue'); } }, ['View stock'])])
  ]);
  if (state.ready.pieces === 'missing' || state.ready.pieces === 'error') lowCard.append(el('p', { class: 'admin-empty', text: 'Connect the database to see your stock alerts.' }));
  else if (!low.length) lowCard.append(el('p', { class: 'admin-empty', text: 'All tracked pieces are above their low-stock threshold.' }));
  else {
    const list = el('ul', { class: 'admin-list' });
    low.slice(0, 5).forEach((piece) => list.append(el('li', { class: 'admin-list-row' }, [
      el('div', { class: 'admin-list-main' }, [el('p', { class: 'admin-list-title', text: piece.name }), el('p', { class: 'admin-list-sub', text: piece.sku || piece.id })]),
      statusPill(stockLevel(piece).key, stockLevel(piece).label, stockLevel(piece).tone),
      el('button', { class: 'admin-btn admin-btn-small', type: 'button', onclick: () => editPiece(piece) }, ['Edit'])
    ])));
    lowCard.append(list);
  }
  const upcoming = state.appointments.filter((row) => ['new', 'confirmed'].includes(row.status)).slice(0, 5);
  const apptCard = el('section', { class: 'admin-card' }, [
    el('div', { class: 'admin-card-head' }, [el('h2', { class: 'admin-card-title', text: 'Upcoming appointments' }),
      el('button', { class: 'admin-btn admin-btn-small admin-btn-quiet', type: 'button', onclick: () => navigate('appointments') }, ['View all'])])
  ]);
  if (!upcoming.length) apptCard.append(el('p', { class: 'admin-empty', text: 'Nothing waiting. New website requests will appear here.' }));
  else {
    const list = el('ul', { class: 'admin-list' });
    upcoming.forEach((row) => list.append(el('li', { class: 'admin-list-row' }, [
      el('div', { class: 'admin-list-main' }, [el('p', { class: 'admin-list-title', text: row.name }), el('p', { class: 'admin-list-sub', text: formatDate(row.preferred_date) + ' · ' + (row.preferred_time || '') })]),
      statusPill(row.status), el('button', { class: 'admin-btn admin-btn-small', type: 'button', onclick: () => openAppointment(row) }, ['Open'])
    ])));
    apptCard.append(list);
  }
  panel.append(el('div', { class: 'admin-overview-grid' }, [lowCard, apptCard]));
}

/* -------------------------- Stock & catalogue ------------------------- */
function renderCatalogue() {
  const panel = $('#panelCatalogue');
  clear(panel);
  if (state.ready.pieces === 'missing') { panel.append(missingCard('Connect your stock & catalogue', true)); return; }
  if (state.ready.pieces === 'error') { panel.append(errorCard('stock', state.errors.pieces, refresh)); return; }
  const body = el('tbody');
  const count = el('p', { class: 'admin-card-note', role: 'status' });
  const search = input(state.pieceSearch, { type: 'search', class: 'admin-search', placeholder: 'Search name, SKU or location', 'aria-label': 'Search stock', oninput: (event) => { state.pieceSearch = event.target.value; fill(); } });
  const filters = el('div', { class: 'admin-segmented admin-stock-filters', role: 'group', 'aria-label': 'Filter stock' },
    [['all', 'All'], ['low', 'Low / out'], ['out', 'Out of stock'], ['untracked', 'Not tracked'], ['hidden', 'Hidden']].map(([key, label]) => el('button', {
      class: 'admin-seg' + (state.stockFilter === key ? ' active' : ''), type: 'button', 'aria-pressed': state.stockFilter === key,
      onclick: () => { state.stockFilter = key; renderCatalogue(); }
    }, [label])));
  panel.append(el('section', { class: 'admin-card' }, [
    el('div', { class: 'admin-card-head' }, [el('h2', { class: 'admin-card-title', text: 'Your pieces' }),
      el('div', { class: 'admin-card-actions' }, [
        el('button', { class: 'admin-btn admin-btn-small admin-btn-quiet', type: 'button', onclick: exportStock }, ['Export CSV']),
        el('button', { class: 'admin-btn admin-btn-small admin-btn-quiet', type: 'button', onclick: exportForBuild }, ['Export for build.py']),
        el('button', { class: 'admin-btn admin-btn-primary', type: 'button', onclick: () => editPiece(null) }, ['+ Add stock'])
      ])]),
    el('p', { class: 'admin-card-note', text: 'One record for each piece: catalogue details and inventory together. Prices are in PKR. Cost, SKU and stock counts stay private. Switch on tracking to show availability on the website.' }),
    el('div', { class: 'admin-toolbar' }, [filters, search, count]),
    el('div', { class: 'admin-table-wrap' }, [el('table', { class: 'admin-table admin-stock-table' }, [
      el('thead', {}, [el('tr', {}, ['Piece', 'SKU', 'Quantity', 'Selling price', 'Stock', 'On website', 'Actions'].map((label) => el('th', { text: label })))]), body
    ])])
  ]));
  function fill() {
    clear(body);
    const rows = state.pieces.filter((piece) => {
      const level = stockLevel(piece).key;
      const filter = state.stockFilter === 'all' || (state.stockFilter === 'low' && ['low', 'out'].includes(level)) || level === state.stockFilter;
      const q = state.pieceSearch.trim().toLowerCase();
      return filter && (!q || [piece.name, piece.id, piece.sku, piece.location, piece.type].filter(Boolean).join(' ').toLowerCase().includes(q));
    });
    count.textContent = rows.length + ' of ' + state.pieces.length + ' pieces';
    if (!rows.length) { body.append(el('tr', {}, [el('td', { colspan: 7 }, [el('p', { class: 'admin-empty', text: state.pieces.length ? 'No pieces match this view.' : 'Add your first piece to start your catalogue and stock book.' })])])); return; }
    rows.forEach((piece) => {
      const level = stockLevel(piece), photo = safeImage(piece.photo);
      const quantity = piece.track_stock ? el('div', { class: 'admin-quantity' }, [
        el('button', { class: 'admin-quantity-btn', type: 'button', 'aria-label': 'Decrease ' + piece.name + ' quantity', disabled: piece.stock_quantity <= 0, onclick: (event) => adjustQuantity(piece, -1, event.currentTarget) }, ['−']),
        el('span', { text: String(piece.stock_quantity) }),
        el('button', { class: 'admin-quantity-btn', type: 'button', 'aria-label': 'Increase ' + piece.name + ' quantity', onclick: (event) => adjustQuantity(piece, 1, event.currentTarget) }, ['+'])
      ]) : el('button', { class: 'admin-linklike', type: 'button', onclick: () => editPiece(piece) }, ['Track stock']);
      const visible = el('input', { type: 'checkbox', checked: piece.visible !== false, 'aria-label': 'Show ' + piece.name + ' on website', onchange: (event) => togglePieceVisible(piece, event.target) });
      body.append(el('tr', {}, [
        el('td', {}, [el('div', { class: 'admin-post-cell' }, [
          photo ? el('img', { class: 'admin-thumb', src: photo, alt: '', loading: 'lazy', onerror: (event) => { event.target.hidden = true; } }) : null,
          el('div', {}, [el('button', { class: 'admin-linklike', type: 'button', onclick: () => editPiece(piece) }, [piece.name]), el('span', { class: 'admin-sub', text: TYPES[piece.type] || piece.type })])
        ])]),
        el('td', {}, [el('span', { class: 'admin-sku', text: piece.sku || '—' }), piece.location ? el('span', { class: 'admin-sub', text: piece.location }) : null]),
        el('td', {}, [quantity]), el('td', { class: 'admin-nowrap', text: money(piece.price) }),
        el('td', {}, [statusPill(level.key, level.label, level.tone)]),
        el('td', {}, [el('label', { class: 'admin-switch' }, [visible, el('span', { class: 'admin-switch-track' }), el('span', { class: 'admin-switch-label', text: piece.visible === false ? 'Hidden' : 'Visible' })])]),
        el('td', {}, [el('div', { class: 'admin-actions' }, [
          el('button', { class: 'admin-btn admin-btn-small', type: 'button', onclick: () => editPiece(piece) }, ['Edit']),
          state.sample ? el('button', { class: 'admin-btn admin-btn-small', type: 'button', onclick: () => previewPiece(piece) }, ['Preview']) : el('a', { class: 'admin-btn admin-btn-small', href: 'piece.html?id=' + encodeURIComponent(piece.id), target: '_blank', rel: 'noopener' }, ['View']),
          el('button', { class: 'admin-btn admin-btn-small admin-btn-danger-quiet', type: 'button', onclick: () => deletePiece(piece) }, ['Delete'])
        ])])
      ]));
    });
  }
  fill();
}

function formSection(title, fields) {
  return el('fieldset', { class: 'admin-form-section' }, [el('legend', { text: title }), el('div', { class: 'admin-form-two' }, fields)]);
}

function editPiece(piece) {
  const isNew = !piece;
  const record = piece || { id: '', name: '', type: 'rings', occasion: 'everyday', motif: 'rings', badge: '', metals: ['gold21'], tags: [], description: '', story: '', specs: [], photo: '', sort_order: state.pieces.length, visible: true, featured: false, sku: '', track_stock: false, stock_quantity: 0, low_stock_threshold: 2, price: null, cost_price: null, weight_grams: null, location: '' };
  const name = input(record.name, { maxLength: 160, required: true, placeholder: 'Meher Solitaire Ring' });
  const id = input(record.id, { maxLength: 80, disabled: !isNew, placeholder: 'meher-solitaire-ring', autocapitalize: 'none', spellcheck: false });
  let idEdited = !isNew;
  id.addEventListener('input', () => { idEdited = true; });
  name.addEventListener('input', () => { if (!idEdited) id.value = slugify(name.value).slice(0, 80).replace(/-+$/g, ''); });
  const type = select(TYPES, record.type), occasion = select(OCCASIONS, record.occasion);
  const motif = select(Object.fromEntries(MOTIFS.map((key) => [key, key[0].toUpperCase() + key.slice(1)])), record.motif);
  const badge = input(record.badge, { maxLength: 60, placeholder: 'New, Bestseller, Signature…' });
  const description = textarea(record.description, 2, { maxLength: 1000 });
  const story = textarea(record.story, 4, { maxLength: 10000 });
  const tags = input((record.tags || []).join(', '), { placeholder: 'BIS Hallmarked, IGI Certified' });
  const photo = input(record.photo, { placeholder: 'https://… or assets/products/meher.webp' });
  const specs = textarea((record.specs || []).map((pair) => pair.join(': ')).join('\n'), 4, { placeholder: 'Metal: 21K yellow gold\nFinish: High polish' });
  const sort = input(record.sort_order ?? 0, { type: 'number', step: 1, min: 0, max: 1000000 });
  const metal = el('input', { type: 'checkbox', checked: (record.metals || []).includes('gold21') });
  const visible = el('input', { type: 'checkbox', checked: record.visible !== false });
  const featured = el('input', { type: 'checkbox', checked: !!record.featured });
  const track = el('input', { type: 'checkbox', checked: !!record.track_stock });
  const quantity = input(record.stock_quantity ?? 0, { type: 'number', min: 0, step: 1 });
  const threshold = input(record.low_stock_threshold ?? 2, { type: 'number', min: 0, step: 1 });
  const sku = input(record.sku, { maxLength: 80, placeholder: 'ALM-RING-001', autocapitalize: 'characters' });
  const location = input(record.location, { maxLength: 160, placeholder: 'Display A, tray 3…' });
  const price = input(record.price, { type: 'number', min: 0, step: '0.01', placeholder: 'PKR' });
  const cost = input(record.cost_price, { type: 'number', min: 0, step: '0.01', placeholder: 'Private · PKR' });
  const weight = input(record.weight_grams, { type: 'number', min: 0, step: '0.001', placeholder: 'Grams' });
  const form = el('form', { class: 'admin-form', novalidate: true }, [
    formSection('Piece details', [field('Name *', name), field('URL ID', id, isNew ? 'Generated from the name. Fixed after saving.' : 'Fixed so existing links keep working.'), field('Type', type), field('Occasion', occasion), field('Badge', badge), field('Fallback illustration', motif), field('Short description', description), field('Story', story), field('Tags', tags, 'Separate with commas.'), field('Photograph', photo, 'HTTPS URL or assets/ path. Leave blank for the illustration.'), field('Specifications', specs, 'One per line, as Label: value.'), field('Sort order', sort, 'Lower numbers appear first.')]),
    formSection('Inventory · private to admins', [field('SKU', sku), field('Storage location', location), field('Selling price (PKR)', price), field('Cost price (PKR)', cost), field('Weight (grams)', weight), field('Low-stock alert at', threshold)]),
    el('label', { class: 'admin-check admin-tracking-check' }, [track, el('span', { text: 'Track stock quantity for this piece' })]),
    el('div', { class: 'admin-form-two' }, [field('Quantity on hand', quantity, 'Use 0 for out of stock. Only tracked quantities affect website availability.')]),
    el('div', { class: 'admin-checks' }, [
      el('label', { class: 'admin-check' }, [metal, el('span', { text: '21K gold' })]),
      el('label', { class: 'admin-check' }, [visible, el('span', { text: 'Show on website' })]),
      el('label', { class: 'admin-check' }, [featured, el('span', { text: 'Feature on home page' })])
    ])
  ]);
  const saveButton = el('button', { class: 'admin-btn admin-btn-primary', type: 'button', onclick: () => form.requestSubmit() }, [isNew ? 'Add piece' : 'Save changes']);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = validateStock({ id: id.value, name: name.value, photo: photo.value, sku: sku.value, location: location.value,
      track_stock: track.checked, stock_quantity: quantity.value, low_stock_threshold: threshold.value,
      price: price.value, cost_price: cost.value, weight_grams: weight.value });
    if (result.error) { formError(form, result.error); return; }
    if (!metal.checked) { formError(form, 'Select 21K gold as the metal.'); return; }
    const order = Number(sort.value);
    if (!Number.isInteger(order) || order < 0 || order > 1000000) { formError(form, 'Sort order must be a whole number from 0 to 1,000,000.'); return; }
    const pairs = [];
    for (const line of specs.value.split('\n').filter((line) => line.trim())) {
      const colon = line.indexOf(':');
      if (colon < 1 || !line.slice(colon + 1).trim()) { formError(form, 'Write each specification as “Label: value”.'); return; }
      pairs.push([line.slice(0, colon).trim(), line.slice(colon + 1).trim()]);
    }
    if (state.sample && state.pieces.some((row) => row.id !== piece?.id && (row.id === result.value.id || (result.value.sku && row.sku?.toUpperCase() === result.value.sku)))) { formError(form, 'That URL ID or SKU is already used by another piece.'); return; }
    const row = { ...result.value, type: type.value, occasion: occasion.value, motif: motif.value,
      badge: badge.value.trim() || null, metals: ['gold21'], tags: tags.value.split(',').map((tag) => tag.trim()).filter(Boolean),
      description: description.value.trim(), story: story.value.trim(), specs: pairs, photo: safeImage(photo.value) || null,
      sort_order: order, visible: visible.checked, featured: featured.checked };
    saving(saveButton, 'Saving…', async () => {
      if (state.sample) {
        if (piece) Object.assign(piece, row); else state.pieces.push(row);
      } else {
        const { error } = await (isNew ? supabase.from('pieces').insert(row) : supabase.from('pieces').update(row).eq('id', piece.id));
        if (error) { formError(form, databaseError(error)); return; }
      }
      modal.close();
      toast(state.sample ? 'Piece saved in this preview only.' : isNew ? 'Piece added to stock and catalogue.' : 'Piece and stock updated.', 'success');
      await refresh();
    });
  });
  const modal = openModal(isNew ? 'Add stock' : 'Edit ' + record.name, form,
    el('div', { class: 'admin-modal-actions' }, [el('button', { class: 'admin-btn', type: 'button', onclick: () => modal.close() }, ['Cancel']), saveButton]));
}

function previewPiece(piece) {
  const photo = safeImage(piece.photo);
  openModal('Catalogue preview', el('article', { class: 'admin-product-preview' }, [
    el('p', { class: 'admin-notice', text: 'Sample preview · not published to your live website.' }),
    photo ? el('img', { src: photo, alt: piece.name, onerror: (event) => { event.target.hidden = true; } }) : null,
    el('p', { class: 'journal-category', text: TYPES[piece.type] || piece.type }), el('h2', { text: piece.name }),
    el('p', { text: piece.description || '' }), el('p', { text: piece.story || '' }),
    statusPill(piece.in_stock === false ? 'out' : 'in', piece.track_stock && piece.stock_quantity === 0 ? 'Currently unavailable' : 'Ask us about availability')
  ]));
}

async function updatePieceFields(piece, values, message, control) {
  if (control) control.disabled = true;
  try {
    if (!state.sample) {
      const { error } = await supabase.from('pieces').update(values).eq('id', piece.id);
      if (error) throw error;
    } else Object.assign(piece, values);
    toast(state.sample ? 'Sample stock updated.' : message, 'success');
    await refresh();
  } catch (error) { toast(databaseError(error), 'error'); if (control) control.checked = !control.checked; }
  finally { if (control) control.disabled = false; }
}
const adjustQuantity = (piece, delta, control) => updatePieceFields(piece, { stock_quantity: Math.max(0, piece.stock_quantity + delta) }, 'Quantity updated.', control);
const togglePieceVisible = (piece, control) => updatePieceFields(piece, { visible: control.checked }, control.checked ? 'Piece is visible on the website.' : 'Piece is hidden from the website.', control);

function deletePiece(piece) {
  confirmModal('Delete ' + piece.name + '?', 'This removes the piece, its inventory record and its public listing. To stop showing it temporarily, switch off “Show on website” instead.', 'Delete piece', async () => {
    if (!state.sample) {
      const { error } = await supabase.from('pieces').delete().eq('id', piece.id);
      if (error) { toast(databaseError(error), 'error'); return false; }
    } else state.pieces = state.pieces.filter((row) => row.id !== piece.id);
    toast(state.sample ? 'Sample piece deleted.' : 'Piece deleted.', 'success');
    await refresh();
  });
}

function exportStock() {
  download(toCsv(state.pieces, [
    { label: 'ID', value: (row) => row.id }, { label: 'Name', value: (row) => row.name }, { label: 'SKU', value: (row) => row.sku },
    { label: 'Type', value: (row) => TYPES[row.type] || row.type }, { label: 'Tracked', value: (row) => row.track_stock },
    { label: 'Quantity', value: (row) => row.stock_quantity }, { label: 'Low-stock threshold', value: (row) => row.low_stock_threshold },
    { label: 'Selling price PKR', value: (row) => row.price }, { label: 'Cost price PKR', value: (row) => row.cost_price },
    { label: 'Weight grams', value: (row) => row.weight_grams }, { label: 'Location', value: (row) => row.location },
    { label: 'Visible', value: (row) => row.visible }, { label: 'Status', value: (row) => stockLevel(row).label }
  ]), 'alm-stock.csv', 'text/csv;charset=utf-8');
  toast('Stock exported. Cost prices are included; keep this file private.', 'success');
}

function exportForBuild() {
  const py = (value) => JSON.stringify(String(value ?? ''));
  const bool = (value) => value ? 'True' : 'False';
  const lines = state.pieces.map((piece) => {
    const bits = ['id=' + py(piece.id), 'name=' + py(piece.name), 'type=' + py(piece.type),
      'metals=[' + (piece.metals || []).map(py).join(', ') + ']', 'occasion=' + py(piece.occasion), 'motif=' + py(piece.motif)];
    if (piece.badge) bits.push('badge=' + py(piece.badge));
    bits.push('featured=' + bool(piece.featured), 'visible=' + bool(piece.visible), 'desc=' + py(piece.description), 'story=' + py(piece.story),
      'tags=[' + (piece.tags || []).map(py).join(', ') + ']', 'specs=[' + (piece.specs || []).map((pair) => '(' + py(pair[0]) + ', ' + py(pair[1]) + ')').join(', ') + ']');
    if (piece.photo) bits.push('photo=' + py(piece.photo));
    bits.push('sort_order=' + (piece.sort_order || 0));
    for (const key of ['sku', 'location']) if (piece[key]) bits.push(key + '=' + py(piece[key]));
    for (const key of ['price', 'cost_price', 'weight_grams']) if (piece[key] != null) bits.push(key + '=' + piece[key]);
    bits.push('track_stock=' + bool(piece.track_stock), 'stock_quantity=' + (piece.stock_quantity || 0), 'low_stock_threshold=' + (piece.low_stock_threshold ?? 2));
    return '    dict(' + bits.join(', ') + '),';
  });
  download('# Generated from the admin panel. Replace PRODUCTS in build.py,\n# then run python3 build.py. Existing Supabase records still take precedence.\n\nPRODUCTS = [\n' + lines.join('\n') + '\n]\n', 'products-export.py');
  toast('Downloaded products-export.py for your static build.', 'success');
}

/* ---------------------------- Appointments ---------------------------- */
function renderAppointments() {
  const panel = $('#panelAppointments');
  clear(panel);
  if (state.ready.appointments === 'missing') { panel.append(missingCard('Connect your appointment book')); return; }
  if (state.ready.appointments === 'error') { panel.append(errorCard('appointments', state.errors.appointments, refresh)); return; }
  const body = el('tbody'), count = el('p', { class: 'admin-card-note', role: 'status' });
  const search = input(state.apptSearch, { type: 'search', class: 'admin-search', placeholder: 'Search name, phone or email', 'aria-label': 'Search appointments', oninput: (event) => { state.apptSearch = event.target.value; fill(); } });
  const filters = el('div', { class: 'admin-segmented', role: 'group', 'aria-label': 'Filter appointments' },
    ['all', ...STATUSES].map((key) => el('button', { class: 'admin-seg' + (state.apptFilter === key ? ' active' : ''), type: 'button', 'aria-pressed': state.apptFilter === key, onclick: () => { state.apptFilter = key; renderAppointments(); } }, [key])));
  panel.append(el('section', { class: 'admin-card' }, [
    el('div', { class: 'admin-card-head' }, [el('h2', { class: 'admin-card-title', text: 'Appointment requests' }), count]),
    el('div', { class: 'admin-toolbar' }, [filters, search]),
    el('div', { class: 'admin-table-wrap' }, [el('table', { class: 'admin-table' }, [
      el('thead', {}, [el('tr', {}, ['Client', 'Contact', 'Purpose', 'Preferred', 'Status', 'Actions'].map((label) => el('th', { text: label })))]), body
    ])])
  ]));
  function fill() {
    clear(body);
    const q = state.apptSearch.trim().toLowerCase();
    const rows = state.appointments.filter((row) => (state.apptFilter === 'all' || row.status === state.apptFilter) && (!q || [row.name, row.phone, row.email, row.purpose, row.notes].filter(Boolean).join(' ').toLowerCase().includes(q)));
    count.textContent = rows.length + ' of ' + state.appointments.length + ' requests';
    if (!rows.length) { body.append(el('tr', {}, [el('td', { colspan: 6 }, [el('p', { class: 'admin-empty', text: 'No appointments match this view.' })])])); return; }
    rows.forEach((row) => {
      const actions = el('div', { class: 'admin-actions' });
      STATUSES.filter((status) => status !== row.status).forEach((status) => actions.append(el('button', { class: 'admin-btn admin-btn-small', type: 'button', onclick: (event) => setAppointmentStatus(row, status, event.currentTarget) }, [status[0].toUpperCase() + status.slice(1)])));
      actions.append(el('button', { class: 'admin-btn admin-btn-small admin-btn-danger-quiet', type: 'button', onclick: () => deleteAppointment(row) }, ['Delete']));
      body.append(el('tr', {}, [
        el('td', {}, [el('button', { class: 'admin-linklike', type: 'button', onclick: () => openAppointment(row) }, [row.name]), el('span', { class: 'admin-sub', text: 'Requested ' + ago(row.created_at) })]),
        el('td', {}, [el('a', { class: 'admin-link', href: 'tel:' + String(row.phone || '').replace(/\s/g, ''), text: row.phone || '—' }), row.email ? el('span', { class: 'admin-sub admin-email', text: row.email }) : null]),
        el('td', { text: row.purpose || '—' }), el('td', { class: 'admin-nowrap', text: formatDate(row.preferred_date) + (row.preferred_time ? ' · ' + row.preferred_time : '') }),
        el('td', {}, [statusPill(row.status)]), el('td', {}, [actions])
      ]));
    });
  }
  fill();
}
function openAppointment(row) {
  openModal(row.name || 'Appointment request', el('dl', { class: 'admin-detail' }, [
    detailRow('Phone', row.phone), detailRow('Email', row.email), detailRow('Purpose', row.purpose),
    detailRow('Preferred', formatDate(row.preferred_date) + ' at ' + (row.preferred_time || '—')), detailRow('Notes', row.notes),
    detailRow('Status', row.status), detailRow('Source', row.source), detailRow('Submitted', formatDateTime(row.created_at))
  ]), el('div', { class: 'admin-modal-actions' }, [el('a', { class: 'admin-btn', href: 'https://wa.me/' + String(row.phone || '').replace(/\D/g, ''), target: '_blank', rel: 'noopener' }, ['Message on WhatsApp'])]));
}
async function setAppointmentStatus(row, status, control) {
  await saving(control, 'Saving…', async () => {
    if (!state.sample) {
      const { error } = await supabase.from('appointments').update({ status }).eq('id', row.id);
      if (error) { toast(databaseError(error), 'error'); return; }
    } else row.status = status;
    toast(state.sample ? 'Sample appointment updated.' : 'Marked as ' + status + '.', 'success');
    await refresh();
  });
}
function deleteAppointment(row) {
  confirmModal('Delete this request?', 'Remove the booking for ' + row.name + ' on ' + formatDate(row.preferred_date) + '? This cannot be undone.', 'Delete request', async () => {
    if (!state.sample) {
      const { error } = await supabase.from('appointments').delete().eq('id', row.id);
      if (error) { toast(databaseError(error), 'error'); return false; }
    } else state.appointments = state.appointments.filter((item) => item.id !== row.id);
    toast(state.sample ? 'Sample request deleted.' : 'Request deleted.', 'success');
    await refresh();
  });
}

async function boot() {
  if (sessionStorage.getItem(SAMPLE_KEY)) { await enterSampleMode(true); return; }
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session?.user) await afterAuth(data.session.user); else showView('auth');
  } catch (error) { showView('auth'); authMessage('Could not check your session: ' + error.message + '. You can still explore the sample workspace.'); }
}
boot();
