/* ==========================================================================
   Alif Laam Meem Jewellers — admin panel
   ==========================================================================
   Sign in with a Supabase account whose email is on the admin allow-list, then
   manage appointments, the catalogue and customer accounts.

   Two layers of access control, and it is worth being clear about which is
   which:

     1. Row level security in supabase/schema.sql is the real gate. The browser
        only ever holds the public anon key, so an account that is not an admin
        cannot read or write any of this data no matter what this file does.
     2. The checks here are the interface: they hide the admin-only screens and
        explain why you are seeing them.

   The allow-list itself lives in public.admin_emails, read through the
   public.is_admin() function. ADMIN_EMAILS in supabase-config.js is only a
   fallback for before the schema has been run.
   ========================================================================== */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_EMAILS } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* Keep these in step with METALS, TYPES, OCCASIONS and MOTIF in build.py. */
const METALS = { gold21: '21K Gold' };
const TYPES = {
  rings: 'Rings', necklace: 'Necklaces', earrings: 'Earrings',
  bangles: 'Bangles', bridal: 'Bridal Sets'
};
const OCCASIONS = {
  bridal: 'Bridal', engagement: 'Engagement', festive: 'Festive',
  everyday: 'Everyday', gifting: 'Gifting', investment: 'Investment'
};
const MOTIFS = ['rings', 'necklace', 'pendants', 'earrings', 'bangles', 'bridal'];

const STATUSES = ['new', 'confirmed', 'completed', 'cancelled'];

/* --------------------------------------------------------------------------
   State
   -------------------------------------------------------------------------- */
const state = {
  user: null,
  isAdmin: false,
  adminSource: null,          // 'database' | 'local'
  tab: 'overview',
  sample: false,              // sample-data mode: never touches the database
  appointments: [],
  pieces: [],
  customers: [],
  ready: {},                  // per-table: 'ok' | 'missing' | 'error'
  errors: {},
  apptFilter: 'all',
  apptSearch: '',
  pieceSearch: '',
  custSearch: ''
};

/* --------------------------------------------------------------------------
   Small helpers
   -------------------------------------------------------------------------- */
const $ = (sel, ctx) => (ctx || document).querySelector(sel);

function el(tag, props, children) {
  const node = document.createElement(tag);
  Object.entries(props || {}).forEach(([k, v]) => {
    if (v === null || v === undefined || v === false) return;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'html') node.innerHTML = v;   // trusted, static markup only
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else node.setAttribute(k, v === true ? '' : v);
  });
  (children || []).forEach((c) => {
    if (c === null || c === undefined || c === false) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); };

function isMissingRelation(err) {
  if (!err) return false;
  const code = String(err.code || '');
  return code === '42P01' || code === 'PGRST205' || code === 'PGRST202' ||
    /does not exist|could not find the table|could not find the function/i.test(err.message || '');
}

function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d)) return '—';
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function ago(value) {
  if (!value) return '—';
  const then = new Date(value).getTime();
  if (isNaN(then)) return '—';
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + ' min ago';
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
  const days = Math.round(hrs / 24);
  if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
  return fmtDate(value);
}

/* --------------------------------------------------------------------------
   Toast
   -------------------------------------------------------------------------- */
let toastTimer = null;
function toast(message, kind) {
  const node = $('#toast');
  if (!node) return;
  node.textContent = message;
  node.dataset.kind = kind || 'info';
  node.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.hidden = true; }, 4200);
}

/* --------------------------------------------------------------------------
   Modal
   -------------------------------------------------------------------------- */
function openModal(title, body, footer) {
  const root = $('#modalRoot');
  clear(root);

  const close = () => { clear(root); document.removeEventListener('keydown', onKey); };

  const dialog = el('div', { class: 'admin-modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, [
    el('div', { class: 'admin-modal-head' }, [
      el('h2', { class: 'admin-modal-title', text: title }),
      el('button', { class: 'admin-modal-x', type: 'button', 'aria-label': 'Close', onclick: close }, ['×'])
    ]),
    el('div', { class: 'admin-modal-body' }, [body]),
    footer ? el('div', { class: 'admin-modal-foot' }, [footer]) : null
  ]);

  function onKey(e) { if (e.key === 'Escape') close(); }

  const backdrop = el('div', {
    class: 'admin-modal',
    onclick: (e) => { if (e.target === backdrop) close(); }
  }, [dialog]);

  root.appendChild(backdrop);
  document.addEventListener('keydown', onKey);
  const focusable = dialog.querySelector('input, textarea, select, button');
  if (focusable) focusable.focus();
  return { close: close, dialog: dialog };
}

function confirmModal(title, message, confirmLabel, onConfirm) {
  const modal = openModal(title,
    el('p', { class: 'admin-modal-text', text: message }),
    el('div', { class: 'admin-modal-actions' }, [
      el('button', { class: 'admin-btn', type: 'button', onclick: () => modal.close() }, ['Cancel']),
      el('button', {
        class: 'admin-btn admin-btn-danger', type: 'button',
        onclick: () => { modal.close(); onConfirm(); }
      }, [confirmLabel])
    ]));
  return modal;
}

/* --------------------------------------------------------------------------
   Auth
   -------------------------------------------------------------------------- */
function showView(which) {
  $('#viewAuth').hidden = which !== 'auth';
  $('#viewApp').hidden = which !== 'app';
  $('#signOutBtn').hidden = which !== 'app';
  const who = $('#adminWho');
  who.hidden = !(which === 'app' && state.user);
}

/* Is the signed-in account an admin?
   The database is authoritative. Only when public.is_admin() has not been
   created yet do we fall back to the local list, and we say so on screen. */
async function checkAdmin(user) {
  const { data, error } = await supabase.rpc('is_admin');

  if (!error && typeof data === 'boolean') {
    return { ok: data, source: 'database' };
  }

  if (isMissingRelation(error)) {
    const list = (ADMIN_EMAILS || []).map((e) => String(e).toLowerCase());
    const ok = list.indexOf(String(user.email || '').toLowerCase()) !== -1;
    return { ok: ok, source: 'local', warning: !list.length };
  }

  return { ok: false, source: 'database', error: error };
}

async function afterAuth(user) {
  const result = await checkAdmin(user);

  if (!result.ok) {
    await supabase.auth.signOut();
    showView('auth');
    const msg = $('#authMessage');
    msg.hidden = false;
    msg.dataset.state = 'error';
    msg.textContent = result.error
      ? 'We could not check your permissions: ' + result.error.message
      : 'That account is not on the admin list. Add its email to admin_emails in Supabase, ' +
        'or add it to ADMIN_EMAILS in supabase-config.js if you have not run the schema yet.';
    return;
  }

  state.user = user;
  state.isAdmin = true;
  state.adminSource = result.source;
  if (result.warning) {
    toast('No admin emails are configured in supabase-config.js — check the setup banner.', 'warn');
  }

  $('#adminWho').textContent = user.email || 'Signed in';
  showView('app');
  await loadAll();
}

async function boot() {
  const { data } = await supabase.auth.getSession();
  if (data && data.session && data.session.user) {
    await afterAuth(data.session.user);
  } else {
    showView('auth');
  }
}

$('#signInForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = $('#adminEmail').value.trim();
  const password = $('#adminPassword').value;
  const btn = $('#signInBtn');
  const msg = $('#authMessage');
  msg.hidden = true;

  if (!email || !password) {
    msg.hidden = false;
    msg.dataset.state = 'error';
    msg.textContent = 'Enter your email address and password.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Signing in…';
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    btn.disabled = false;
    btn.textContent = 'Sign in';
    msg.hidden = false;
    msg.dataset.state = 'error';
    const text = String((error && error.message) || '');
    msg.textContent = /invalid login/i.test(text)
      ? 'Those details do not match an account. Check the email and password, and confirm the email address if you have only just signed up.'
      : (text || 'We could not sign you in. Please try again.');
    return;
  }

  btn.disabled = false;
  btn.textContent = 'Sign in';
  await afterAuth(data.user);
});

$('#signOutBtn').addEventListener('click', async () => {
  await supabase.auth.signOut();
  state.user = null;
  state.isAdmin = false;
  state.sample = false;
  showView('auth');
});

/* --------------------------------------------------------------------------
   Sample data — look around before the database exists
   -------------------------------------------------------------------------- */
async function samplePieces() {
  // Prefer the real catalogue so the preview looks like the shop.
  try {
    const res = await fetch('collections.html');
    if (res.ok) {
      const html = await res.text();
      const match = html.match(/<script type="application\/json" id="catalogue-data">([\s\S]*?)<\/script>/);
      if (match) {
        const data = JSON.parse(match[1]);
        return (data.items || []).map((it, i) => ({
          id: it.id, name: it.name, type: it.type, occasion: it.occasion,
          motif: it.motif, badge: it.badge || '', metals: ['gold21'],
          tags: it.tags || [], description: it.desc, story: it.story,
          specs: it.specs || [], photo: it.photo, sort_order: i,
          visible: true, featured: i < 3
        }));
      }
    }
  } catch (err) { /* opening the file directly, or offline — fall through */ }

  return [
    {
      id: 'meher', name: 'Meher Solitaire Ring', type: 'rings', occasion: 'engagement',
      motif: 'rings', badge: 'Bestseller', metals: ['gold21'], tags: ['BIS Hallmarked'],
      description: 'A brilliant-cut solitaire raised on a hand-forged 21K gold band.',
      story: 'Set in a six-claw mount so light reaches the stone from every angle.',
      specs: [['Metal', '21K yellow gold']], photo: null,
      sort_order: 0, visible: true, featured: true
    }
  ];
}

function sampleAppointments() {
  const now = Date.now();
  const rows = [
    ['Ayesha Rehman', '+92 311 481 7882', 'ayesha@example.com', 'Bridal polki & kundan suite', 2, '15:00', 'new'],
    ['Hira Nawaz', '+92 300 123 4567', 'hira@example.com', 'Engagement / wedding jewellery', 3, '11:00', 'confirmed'],
    ['Sana Iqbal', '+92 333 987 6543', '', 'Old gold exchange or buyback', 1, '17:00', 'completed'],
    ['Zara Ahmed', '+92 321 555 2211', 'zara@example.com', 'Bespoke commission', 5, '13:00', 'new'],
    ['Maha Tariq', '+92 345 222 1188', '', 'Valuation & certification', -2, '18:00', 'cancelled']
  ];
  return rows.map((r, i) => ({
    id: 'sample-' + i,
    name: r[0], phone: r[1], email: r[2] || null, purpose: r[3],
    preferred_date: new Date(now + r[4] * 86400000).toISOString().slice(0, 10),
    preferred_time: r[5],
    notes: i === 0 ? 'Looking for a full bridal set, budget around 12 lac. Bringing her mother.' : null,
    status: r[6],
    source: 'sample',
    created_at: new Date(now - (i + 1) * 5400000).toISOString()
  }));
}

function sampleCustomers() {
  const now = Date.now();
  return [
    { id: 'sample-c1', email: 'ayesha@example.com', full_name: 'Ayesha Rehman', is_active: true, created_at: new Date(now - 86400000 * 12).toISOString(), last_sign_in_at: new Date(now - 3600000 * 5).toISOString() },
    { id: 'sample-c2', email: 'hira@example.com', full_name: 'Hira Nawaz', is_active: true, created_at: new Date(now - 86400000 * 30).toISOString(), last_sign_in_at: new Date(now - 86400000 * 2).toISOString() },
    { id: 'sample-c3', email: 'old.account@example.com', full_name: '', is_active: false, created_at: new Date(now - 86400000 * 90).toISOString(), last_sign_in_at: null }
  ];
}

async function enterSampleMode() {
  state.sample = true;
  state.user = state.user || { email: 'sample@preview' };
  state.isAdmin = true;
  state.adminSource = 'sample';
  state.pieces = await samplePieces();
  state.appointments = sampleAppointments();
  state.customers = sampleCustomers();
  state.ready = { appointments: 'sample', pieces: 'sample', customers: 'sample' };
  $('#adminWho').textContent = 'Sample data';
  $('#signOutBtn').hidden = false;
  showView('app');
  renderAll();
}

$('#useSampleBtn').addEventListener('click', () => { enterSampleMode(); });

/* --------------------------------------------------------------------------
   Loading
   -------------------------------------------------------------------------- */
async function loadTable(name, query) {
  const { data, error } = await query;
  if (error) {
    state.ready[name] = isMissingRelation(error) ? 'missing' : 'error';
    state.errors[name] = error.message;
    return [];
  }
  state.ready[name] = 'ok';
  return data || [];
}

async function loadAll() {
  if (state.sample) { renderAll(); return; }

  const [appointments, pieces, customers] = await Promise.all([
    loadTable('appointments', supabase.from('appointments').select('*').order('preferred_date', { ascending: true })),
    loadTable('pieces', supabase.from('pieces').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true })),
    loadTable('customers', supabase.from('profiles').select('*').order('created_at', { ascending: false }))
  ]);

  state.appointments = appointments;
  state.pieces = pieces;
  state.customers = customers;
  renderAll();
}

/* --------------------------------------------------------------------------
   Setup banner
   -------------------------------------------------------------------------- */
const SETUP_SQL_HINT =
  'Run supabase/schema.sql in your Supabase SQL editor, then reload this page.';

/* The key is what the panel calls the section; the value is the real table. */
const TABLE_NAMES = {
  appointments: 'public.appointments',
  pieces: 'public.pieces',
  customers: 'public.profiles'
};

function renderSetupBanner() {
  const banner = $('#setupBanner');
  clear(banner);

  const missing = Object.keys(state.ready).filter((k) => state.ready[k] === 'missing');
  const broken = Object.keys(state.ready).filter((k) => state.ready[k] === 'error');
  const notices = [];

  if (state.adminSource === 'local') {
    notices.push({
      title: 'Using the local admin allow-list',
      body: 'public.is_admin() is not installed yet, so access is being decided by ADMIN_EMAILS in ' +
            'supabase-config.js. That is a convenience only — run supabase/schema.sql so row level ' +
            'security can enforce it.'
    });
  }
  if (missing.length) {
    notices.push({
      title: 'Not set up yet: ' + missing.map((k) => TABLE_NAMES[k] || k).join(', '),
      body: SETUP_SQL_HINT
    });
  }
  broken.forEach((name) => {
    notices.push({ title: 'Could not load ' + name, body: state.errors[name] || 'Unknown error.' });
  });
  if (state.sample) {
    notices.push({
      title: 'Sample data',
      body: 'You are looking at sample data. Nothing you change here is saved — sign in to edit the real thing.'
    });
  }

  if (!notices.length) { banner.hidden = true; return; }

  banner.hidden = false;
  notices.forEach((n) => {
    banner.appendChild(el('div', { class: 'admin-notice' }, [
      el('p', { class: 'admin-notice-title', text: n.title }),
      el('p', { class: 'admin-notice-body', text: n.body })
    ]));
  });
}

/* --------------------------------------------------------------------------
   Tabs
   -------------------------------------------------------------------------- */
$('#adminTabs').addEventListener('click', (event) => {
  const btn = event.target.closest('.admin-tab');
  if (!btn) return;
  state.tab = btn.dataset.tab;
  renderAll();
});

function renderAll() {
  renderSetupBanner();

  document.querySelectorAll('.admin-tab').forEach((t) => {
    const on = t.dataset.tab === state.tab;
    t.classList.toggle('active', on);
    if (on) t.setAttribute('aria-current', 'true');
    else t.removeAttribute('aria-current');
  });

  ['overview', 'appointments', 'catalogue', 'customers'].forEach((name) => {
    $('#panel' + name.charAt(0).toUpperCase() + name.slice(1)).hidden = name !== state.tab;
  });

  if (state.tab === 'overview') renderOverview();
  if (state.tab === 'appointments') renderAppointments();
  if (state.tab === 'catalogue') renderCatalogue();
  if (state.tab === 'customers') renderCustomers();
}

/* --------------------------------------------------------------------------
   Overview
   -------------------------------------------------------------------------- */
function statCard(label, value, note) {
  return el('div', { class: 'admin-stat' }, [
    el('p', { class: 'admin-stat-label', text: label }),
    el('p', { class: 'admin-stat-value', text: String(value) }),
    note ? el('p', { class: 'admin-stat-note', text: note }) : null
  ]);
}

function renderOverview() {
  const panel = $('#panelOverview');
  clear(panel);

  const newCount = state.appointments.filter((a) => a.status === 'new').length;
  const visibleCount = state.pieces.filter((p) => p.visible).length;

  const upcoming = state.appointments
    .filter((a) => a.status === 'new' || a.status === 'confirmed')
    .slice(0, 6);

  panel.appendChild(el('div', { class: 'admin-stats' }, [
    statCard('New requests', newCount, 'awaiting a reply'),
    statCard('All appointments', state.appointments.length, 'on record'),
    statCard('Pieces in catalogue', visibleCount,
      state.pieces.length > visibleCount ? (state.pieces.length - visibleCount) + ' hidden' : 'all visible'),
    statCard('Customers', state.customers.length, 'accounts created')
  ]));

  const card = el('section', { class: 'admin-card' }, [
    el('div', { class: 'admin-card-head' }, [
      el('h2', { class: 'admin-card-title', text: 'Upcoming and open requests' }),
      el('button', {
        class: 'admin-btn admin-btn-quiet', type: 'button',
        onclick: () => { state.tab = 'appointments'; renderAll(); }
      }, ['Open appointments'])
    ])
  ]);

  if (!upcoming.length) {
    card.appendChild(el('p', {
      class: 'admin-empty',
      text: state.sample ? 'No open requests in the sample data.'
        : 'Nothing waiting. New booking requests from the website will appear here.'
    }));
  } else {
    const list = el('ul', { class: 'admin-list' });
    upcoming.forEach((a) => {
      list.appendChild(el('li', { class: 'admin-list-row' }, [
        el('div', { class: 'admin-list-main' }, [
          el('p', { class: 'admin-list-title', text: a.name }),
          el('p', { class: 'admin-list-sub', text: (a.purpose || 'Appointment') + ' · ' + fmtDate(a.preferred_date) + (a.preferred_time ? ' at ' + a.preferred_time : '') })
        ]),
        statusPill(a.status),
        el('button', {
          class: 'admin-btn admin-btn-small', type: 'button',
          onclick: () => openAppointment(a)
        }, ['Open'])
      ]));
    });
    card.appendChild(list);
  }

  panel.appendChild(card);
}

function statusPill(status) {
  return el('span', { class: 'admin-pill', dataset: { status: status || 'new' }, text: status || 'new' });
}

/* --------------------------------------------------------------------------
   Appointments
   -------------------------------------------------------------------------- */
function renderAppointments() {
  const panel = $('#panelAppointments');
  clear(panel);

  if (state.ready.appointments === 'missing') {
    panel.appendChild(missingCard(
      'appointments',
      'Booking requests are not being stored yet.',
      'Run supabase/schema.sql to create the appointments table, then every request made on ' +
      'appointment.html lands here as well as in WhatsApp.'
    ));
    return;
  }
  if (state.ready.appointments === 'error') {
    panel.appendChild(errorCard('appointments', state.errors.appointments));
    return;
  }

  const search = el('input', {
    class: 'admin-search', type: 'search', placeholder: 'Search name, phone or email',
    value: state.apptSearch, 'aria-label': 'Search appointments',
    oninput: (e) => { state.apptSearch = e.target.value; filterAppointments(); }
  });

  const tabs = el('div', { class: 'admin-segmented', role: 'group', 'aria-label': 'Filter by status' },
    [{ id: 'all', label: 'All' }].concat(STATUSES.map((s) => ({ id: s, label: s })))
      .map((opt) => el('button', {
        class: 'admin-seg' + (state.apptFilter === opt.id ? ' active' : ''),
        type: 'button', dataset: { filter: opt.id },
        onclick: () => {
          state.apptFilter = opt.id;
          renderAppointments();
        }
      }, [opt.label])));

  const card = el('section', { class: 'admin-card' }, [
    el('div', { class: 'admin-card-head' }, [
      el('h2', { class: 'admin-card-title', text: 'Appointment requests' }),
      el('p', { class: 'admin-card-note', id: 'apptCount' })
    ]),
    el('div', { class: 'admin-toolbar' }, [tabs, search])
  ]);

  const tableWrap = el('div', { class: 'admin-table-wrap' }, [
    el('table', { class: 'admin-table' }, [
      el('thead', {}, [
        el('tr', {}, [
          el('th', { text: 'Client' }),
          el('th', { text: 'Contact' }),
          el('th', { text: 'Purpose' }),
          el('th', { text: 'Preferred' }),
          el('th', { text: 'Status' }),
          el('th', { text: 'Actions' })
        ])
      ]),
      el('tbody', { id: 'apptBody' })
    ])
  ]);
  card.appendChild(tableWrap);
  panel.appendChild(card);

  filterAppointments();
}

function filterAppointments() {
  const body = $('#apptBody');
  if (!body) return;
  clear(body);

  const q = state.apptSearch.trim().toLowerCase();
  const rows = state.appointments.filter((a) => {
    if (state.apptFilter !== 'all' && a.status !== state.apptFilter) return false;
    if (!q) return true;
    return [a.name, a.phone, a.email, a.purpose, a.notes]
      .filter(Boolean).join(' ').toLowerCase().indexOf(q) !== -1;
  });

  const count = $('#apptCount');
  if (count) count.textContent = rows.length + ' of ' + state.appointments.length;

  if (!rows.length) {
    const tr = el('tr', {}, [el('td', { colspan: '6' }, [
      el('p', { class: 'admin-empty', text: q ? 'Nothing matches that search.' : 'No appointments with this status.' })
    ])]);
    body.appendChild(tr);
    return;
  }

  rows.forEach((a) => {
    const actions = el('div', { class: 'admin-actions' });
    STATUSES.forEach((s) => {
      if (s === a.status) return;
      actions.appendChild(el('button', {
        class: 'admin-btn admin-btn-small', type: 'button',
        onclick: () => setAppointmentStatus(a, s)
      }, [s.charAt(0).toUpperCase() + s.slice(1)]));
    });
    actions.appendChild(el('button', {
      class: 'admin-btn admin-btn-small admin-btn-danger-quiet', type: 'button',
      onclick: () => deleteAppointment(a)
    }, ['Delete']));

    body.appendChild(el('tr', {}, [
      el('td', {}, [
        el('button', { class: 'admin-linklike', type: 'button', onclick: () => openAppointment(a) }, [a.name || '—']),
        el('span', { class: 'admin-sub', text: 'Requested ' + ago(a.created_at) })
      ]),
      el('td', {}, [
        el('a', { class: 'admin-link', href: 'tel:' + String(a.phone || '').replace(/\s/g, '') }, [a.phone || '—']),
        a.email ? el('span', { class: 'admin-sub', text: a.email }) : null
      ]),
      el('td', { text: a.purpose || '—' }),
      el('td', { text: fmtDate(a.preferred_date) + (a.preferred_time ? ' · ' + a.preferred_time : '') }),
      el('td', {}, [statusPill(a.status)]),
      el('td', {}, [actions])
    ]));
  });
}

function openAppointment(a) {
  openModal(a.name || 'Appointment request',
    el('div', { class: 'admin-detail' }, [
      detailRow('Phone', a.phone),
      detailRow('Email', a.email),
      detailRow('Purpose', a.purpose),
      detailRow('Preferred', fmtDate(a.preferred_date) + (a.preferred_time ? ' at ' + a.preferred_time : '')),
      detailRow('Notes', a.notes),
      detailRow('Status', a.status),
      detailRow('Source', a.source),
      detailRow('Submitted', fmtDateTime(a.created_at))
    ]),
    el('div', { class: 'admin-modal-actions' }, [
      el('a', {
        class: 'admin-btn', href: 'https://wa.me/' + String(a.phone || '').replace(/[^\d]/g, ''),
        target: '_blank', rel: 'noopener'
      }, ['Message on WhatsApp'])
    ]));
}

function detailRow(label, value) {
  return el('div', { class: 'admin-detail-row' }, [
    el('dt', { text: label }),
    el('dd', { text: value || '—' })
  ]);
}

async function setAppointmentStatus(a, status) {
  if (state.sample) { a.status = status; renderAll(); toast('Sample data — nothing was saved.', 'info'); return; }
  const { error } = await supabase.from('appointments')
    .update({ status: status }).eq('id', a.id);
  if (error) { toast('Could not update: ' + error.message, 'error'); return; }
  toast('Marked as ' + status + '.', 'success');
  await loadAll();
}

function deleteAppointment(a) {
  confirmModal('Delete this request?',
    'The booking for ' + (a.name || 'this client') + ' on ' + fmtDate(a.preferred_date) +
    ' will be removed. This cannot be undone.',
    'Delete request', async () => {
      if (state.sample) {
        state.appointments = state.appointments.filter((x) => x.id !== a.id);
        renderAll();
        return;
      }
      const { error } = await supabase.from('appointments').delete().eq('id', a.id);
      if (error) { toast('Could not delete: ' + error.message, 'error'); return; }
      toast('Request deleted.', 'success');
      await loadAll();
    });
}

/* --------------------------------------------------------------------------
   Catalogue
   -------------------------------------------------------------------------- */
function renderCatalogue() {
  const panel = $('#panelCatalogue');
  clear(panel);

  if (state.ready.pieces === 'missing') {
    panel.appendChild(missingCard(
      'pieces',
      'The live catalogue table is not set up yet.',
      'Run supabase/schema.sql to create public.pieces and seed it with the 22 pieces from ' +
      'build.py. Until then the website shows the generated catalogue and cannot be edited here.'
    ));
    return;
  }
  if (state.ready.pieces === 'error') {
    panel.appendChild(errorCard('pieces', state.errors.pieces));
    return;
  }

  const search = el('input', {
    class: 'admin-search', type: 'search', placeholder: 'Search pieces',
    value: state.pieceSearch, 'aria-label': 'Search the catalogue',
    oninput: (e) => { state.pieceSearch = e.target.value; filterPieces(); }
  });

  const card = el('section', { class: 'admin-card' }, [
    el('div', { class: 'admin-card-head' }, [
      el('h2', { class: 'admin-card-title', text: 'Catalogue' }),
      el('div', { class: 'admin-card-actions' }, [
        el('button', {
          class: 'admin-btn admin-btn-quiet', type: 'button',
          onclick: exportForBuild
        }, ['Export for build.py']),
        el('button', {
          class: 'admin-btn admin-btn-primary admin-btn-small', type: 'button',
          onclick: () => editPiece(null)
        }, ['Add a piece'])
      ])
    ]),
    el('p', {
      class: 'admin-card-note',
      text: 'Changes appear on the website straight away. A brand-new piece shows in the catalogue ' +
            'grid immediately; its own detail page is created the next time you run build.py — use ' +
            'Export for build.py to get the snippet.'
    }),
    el('div', { class: 'admin-toolbar' }, [search]),
    el('div', { class: 'admin-table-wrap' }, [
      el('table', { class: 'admin-table' }, [
        el('thead', {}, [
          el('tr', {}, [
            el('th', { text: 'Piece' }),
            el('th', { text: 'Type' }),
            el('th', { text: 'Badge' }),
            el('th', { text: 'Shown on site' }),
            el('th', { text: 'Actions' })
          ])
        ]),
        el('tbody', { id: 'pieceBody' })
      ])
    ])
  ]);

  panel.appendChild(card);
  filterPieces();
}

function filterPieces() {
  const body = $('#pieceBody');
  if (!body) return;
  clear(body);

  const q = state.pieceSearch.trim().toLowerCase();
  const rows = state.pieces.filter((p) => {
    if (!q) return true;
    return [p.id, p.name, p.type, p.badge, p.description]
      .filter(Boolean).join(' ').toLowerCase().indexOf(q) !== -1;
  });

  if (!rows.length) {
    body.appendChild(el('tr', {}, [el('td', { colspan: '5' }, [
      el('p', { class: 'admin-empty', text: q ? 'Nothing matches that search.' : 'The catalogue is empty.' })
    ])]));
    return;
  }

  rows.forEach((p) => {
    const toggle = el('label', { class: 'admin-switch' }, [
      el('input', {
        type: 'checkbox',
        checked: p.visible !== false,
        onchange: (e) => togglePieceVisible(p, e.target.checked)
      }),
      el('span', { class: 'admin-switch-track' }),
      el('span', { class: 'admin-switch-label', text: p.visible === false ? 'Hidden' : 'Visible' })
    ]);

    body.appendChild(el('tr', {}, [
      el('td', {}, [
        el('button', { class: 'admin-linklike', type: 'button', onclick: () => editPiece(p) }, [p.name || p.id]),
        el('span', { class: 'admin-sub', text: p.id })
      ]),
      el('td', { text: TYPES[p.type] || p.type || '—' }),
      el('td', { text: p.badge || '—' }),
      el('td', {}, [toggle]),
      el('td', {}, [
        el('div', { class: 'admin-actions' }, [
          el('a', {
            class: 'admin-btn admin-btn-small', href: 'piece-' + p.id + '.html',
            target: '_blank', rel: 'noopener'
          }, ['View']),
          el('button', {
            class: 'admin-btn admin-btn-small', type: 'button', onclick: () => editPiece(p)
          }, ['Edit']),
          el('button', {
            class: 'admin-btn admin-btn-small admin-btn-danger-quiet', type: 'button',
            onclick: () => deletePiece(p)
          }, ['Delete'])
        ])
      ])
    ]));
  });
}

function editPiece(piece) {
  const isNew = !piece;
  const p = piece || {
    id: '', name: '', type: 'rings', occasion: 'everyday', motif: 'rings',
    badge: '', metals: ['gold21'], tags: [], description: '', story: '',
    specs: [], photo: '', sort_order: state.pieces.length, visible: true, featured: false
  };

  const field = (label, control, hint) => el('div', { class: 'admin-field' }, [
    el('label', { text: label }),
    control,
    hint ? el('p', { class: 'admin-hint', text: hint }) : null
  ]);

  const idInput = el('input', { type: 'text', value: p.id, placeholder: 'meher', disabled: !isNew, autocapitalize: 'none' });
  const nameInput = el('input', { type: 'text', value: p.name, placeholder: 'Meher Solitaire Ring' });
  const badgeInput = el('input', { type: 'text', value: p.badge || '', placeholder: 'Bestseller, New…' });
  const descInput = el('textarea', { rows: '2' }); descInput.value = p.description || '';
  const storyInput = el('textarea', { rows: '4' }); storyInput.value = p.story || '';
  const tagsInput = el('input', { type: 'text', value: (p.tags || []).join(', '), placeholder: 'BIS Hallmarked, IGI Certified' });
  const photoInput = el('input', { type: 'text', value: p.photo || '', placeholder: 'assets/products/meher.webp' });
  const sortInput = el('input', { type: 'number', value: String(p.sort_order || 0) });
  const specsInput = el('textarea', { rows: '4' });
  specsInput.value = (p.specs || []).map((s) => s[0] + ': ' + s[1]).join('\n');

  const typeSel = el('select', {}, Object.entries(TYPES)
    .map(([k, v]) => el('option', { value: k, selected: p.type === k }, [v])));
  const occSel = el('select', {}, Object.entries(OCCASIONS)
    .map(([k, v]) => el('option', { value: k, selected: p.occasion === k }, [v])));
  const motifSel = el('select', {}, MOTIFS
    .map((m) => el('option', { value: m, selected: p.motif === m }, [m])));
  const motifHint = el('p', {
    class: 'admin-hint',
    text: 'The line drawing used when the piece has no photograph of its own.'
  });

  const metalBox = el('div', { class: 'admin-checks' }, Object.entries(METALS).map(([k, v]) =>
    el('label', { class: 'admin-check' }, [
      el('input', { type: 'checkbox', value: k, checked: (p.metals || []).indexOf(k) !== -1 }),
      el('span', { text: v })
    ])));

  const visibleInput = el('input', { type: 'checkbox', checked: p.visible !== false });
  const featuredInput = el('input', { type: 'checkbox', checked: !!p.featured });

  const form = el('div', { class: 'admin-form admin-form-grid' }, [
    field('Name', nameInput),
    field('URL id', idInput, isNew
      ? 'Lowercase, no spaces. Used for piece-<id>.html — it cannot be changed later.'
      : 'The id is fixed once the piece exists.'),
    field('Type', typeSel),
    field('Occasion', occSel),
    field('Badge', badgeInput, 'Optional. "Bestseller" and "Signature" get the gold badge.'),
    field('Line drawing', motifSel, ''),
    motifHint,
    field('Short description', descInput, 'One line, shown on the catalogue cards.'),
    field('Story', storyInput, 'The longer paragraph shown on the piece’s own page.'),
    field('Tags', tagsInput, 'Comma separated.'),
    field('Photograph', photoInput, 'Optional path, e.g. assets/products/meher.webp. Leave blank to use the line drawing.'),
    field('Specifications', specsInput, 'One per line, as "Label: value".'),
    field('Sort order', sortInput, 'Lower numbers appear first.'),
    field('Metals', metalBox),
    el('div', { class: 'admin-field admin-field-inline' }, [
      el('label', { class: 'admin-check' }, [visibleInput, el('span', { text: 'Shown on the website' })]),
      el('label', { class: 'admin-check' }, [featuredInput, el('span', { text: 'Featured on the home page' })])
    ])
  ]);

  const save = async () => {
    const id = (isNew ? idInput.value.trim() : p.id);
    if (isNew && !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
      toast('Use a lowercase id with no spaces — letters, numbers and dashes only.', 'error');
      return;
    }
    if (!nameInput.value.trim()) { toast('The piece needs a name.', 'error'); return; }

    const specs = specsInput.value.split('\n')
      .map((line) => line.split(':'))
      .filter((parts) => parts.length >= 2 && parts[0].trim())
      .map((parts) => [parts[0].trim(), parts.slice(1).join(':').trim()]);

    const row = {
      id: id,
      name: nameInput.value.trim(),
      type: typeSel.value,
      occasion: occSel.value,
      motif: motifSel.value,
      badge: badgeInput.value.trim() || null,
      metals: Array.from(metalBox.querySelectorAll('input:checked')).map((i) => i.value),
      tags: tagsInput.value.split(',').map((t) => t.trim()).filter(Boolean),
      description: descInput.value.trim(),
      story: storyInput.value.trim(),
      specs: specs,
      photo: photoInput.value.trim() || null,
      sort_order: parseInt(sortInput.value, 10) || 0,
      visible: visibleInput.checked,
      featured: featuredInput.checked
    };

    if (state.sample) {
      if (isNew) state.pieces.push(row);
      else Object.assign(p, row);
      modal.close();
      renderAll();
      toast('Sample data — nothing was saved.', 'info');
      return;
    }

    const query = isNew
      ? supabase.from('pieces').insert(row)
      : supabase.from('pieces').update(row).eq('id', p.id);

    const { error } = await query;
    if (error) {
      toast('Could not save: ' + error.message, 'error');
      return;
    }
    modal.close();
    toast(isNew ? 'Piece added.' : 'Piece saved.', 'success');
    await loadAll();
  };

  const modal = openModal(isNew ? 'Add a piece' : 'Edit ' + (p.name || p.id), form,
    el('div', { class: 'admin-modal-actions' }, [
      el('button', { class: 'admin-btn', type: 'button', onclick: () => modal.close() }, ['Cancel']),
      el('button', { class: 'admin-btn admin-btn-primary', type: 'button', onclick: save },
        [isNew ? 'Add piece' : 'Save changes'])
    ]));
}

async function togglePieceVisible(piece, visible) {
  if (state.sample) {
    piece.visible = visible;
    renderAll();
    toast('Sample data — nothing was saved.', 'info');
    return;
  }
  const { error } = await supabase.from('pieces')
    .update({ visible: visible }).eq('id', piece.id);
  if (error) { toast('Could not update: ' + error.message, 'error'); await loadAll(); return; }
  piece.visible = visible;
  toast(visible ? 'Visible on the website.' : 'Hidden from the website.', 'success');
  renderAll();
}

function deletePiece(piece) {
  confirmModal('Delete ' + (piece.name || piece.id) + '?',
    'The piece is removed from the catalogue and from the website. If you only want to stop ' +
    'showing it for now, use the visibility switch instead.',
    'Delete piece', async () => {
      if (state.sample) {
        state.pieces = state.pieces.filter((x) => x.id !== piece.id);
        renderAll();
        return;
      }
      const { error } = await supabase.from('pieces').delete().eq('id', piece.id);
      if (error) { toast('Could not delete: ' + error.message, 'error'); return; }
      toast('Piece deleted.', 'success');
      await loadAll();
    });
}

/* Export the live catalogue as a Python snippet ready to paste into build.py,
   so edits made here can be baked into the generated site. */
function exportForBuild() {
  const py = (s) => JSON.stringify(String(s == null ? '' : s));
  const lines = state.pieces.map((p) => {
    const specs = (p.specs || []).map((s) => '(%s, %s)'.replace('%s', py(s[0])).replace('%s', py(s[1])));
    const tags = (p.tags || []).map(py);
    const metals = (p.metals || []).map(py);
    const bits = [
      'id=' + py(p.id),
      'name=' + py(p.name),
      'type=' + py(p.type),
      'metals=[' + metals.join(', ') + ']',
      'occasion=' + py(p.occasion),
      'motif=' + py(p.motif)
    ];
    if (p.badge) bits.push('badge=' + py(p.badge));
    if (p.featured) bits.push('featured=True');
    bits.push('desc=' + py(p.description));
    bits.push('story=' + py(p.story));
    bits.push('tags=[' + tags.join(', ') + ']');
    bits.push('specs=[' + specs.join(', ') + ']');
    return '    dict(' + bits.join(', ') + '),';
  });

  const text = '# Generated from the admin panel — paste into PRODUCTS in build.py,\n' +
    '# then run: python3 build.py\n\nPRODUCTS = [\n' + lines.join('\n') + '\n]\n';

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: 'products-export.py' });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Downloaded products-export.py — paste it into PRODUCTS in build.py.', 'success');
}

/* --------------------------------------------------------------------------
   Customers
   -------------------------------------------------------------------------- */
function renderCustomers() {
  const panel = $('#panelCustomers');
  clear(panel);

  if (state.ready.customers === 'missing') {
    panel.appendChild(missingCard(
      'profiles',
      'Customer accounts are not being listed yet.',
      'Run supabase/schema.sql to create public.profiles. It also adds a trigger so every new ' +
      'signup on signup.html is recorded here, and backfills the accounts that already exist.'
    ));
    return;
  }
  if (state.ready.customers === 'error') {
    panel.appendChild(errorCard('customers', state.errors.customers));
    return;
  }

  const search = el('input', {
    class: 'admin-search', type: 'search', placeholder: 'Search name or email',
    value: state.custSearch, 'aria-label': 'Search customers',
    oninput: (e) => { state.custSearch = e.target.value; filterCustomers(); }
  });

  const card = el('section', { class: 'admin-card' }, [
    el('div', { class: 'admin-card-head' }, [
      el('h2', { class: 'admin-card-title', text: 'Customers' }),
      el('p', { class: 'admin-card-note', text: state.customers.length + ' accounts' })
    ]),
    el('div', { class: 'admin-toolbar' }, [search]),
    el('p', {
      class: 'admin-card-note',
      text: 'Switching an account off is a flag on its profile — the website can honour it. To stop ' +
            'someone signing in altogether, ban the user in Authentication → Users in Supabase.'
    }),
    el('div', { class: 'admin-table-wrap' }, [
      el('table', { class: 'admin-table' }, [
        el('thead', {}, [
          el('tr', {}, [
            el('th', { text: 'Customer' }),
            el('th', { text: 'Email' }),
            el('th', { text: 'Signed up' }),
            el('th', { text: 'Last sign in' }),
            el('th', { text: 'Access' }),
            el('th', { text: 'Actions' })
          ])
        ]),
        el('tbody', { id: 'custBody' })
      ])
    ])
  ]);

  panel.appendChild(card);
  filterCustomers();
}

function filterCustomers() {
  const body = $('#custBody');
  if (!body) return;
  clear(body);

  const q = state.custSearch.trim().toLowerCase();
  const rows = state.customers.filter((c) => {
    if (!q) return true;
    return [c.full_name, c.email].filter(Boolean).join(' ').toLowerCase().indexOf(q) !== -1;
  });

  if (!rows.length) {
    body.appendChild(el('tr', {}, [el('td', { colspan: '6' }, [
      el('p', { class: 'admin-empty', text: q ? 'Nothing matches that search.' : 'No customer accounts yet.' })
    ])]));
    return;
  }

  rows.forEach((c) => {
    const toggle = el('label', { class: 'admin-switch' }, [
      el('input', {
        type: 'checkbox', checked: c.is_active !== false,
        onchange: (e) => setCustomerActive(c, e.target.checked)
      }),
      el('span', { class: 'admin-switch-track' }),
      el('span', { class: 'admin-switch-label', text: c.is_active === false ? 'Off' : 'On' })
    ]);

    body.appendChild(el('tr', {}, [
      el('td', { text: c.full_name || '—' }),
      el('td', {}, [el('a', { class: 'admin-link', href: 'mailto:' + (c.email || '') }, [c.email || '—'])]),
      el('td', { text: fmtDate(c.created_at) }),
      el('td', { text: ago(c.last_sign_in_at) }),
      el('td', {}, [toggle]),
      el('td', {}, [
        el('div', { class: 'admin-actions' }, [
          el('a', {
            class: 'admin-btn admin-btn-small',
            href: 'https://wa.me/?text=' + encodeURIComponent('Assalam-o-Alaikum from Alif Laam Meem Jewellers.'),
            target: '_blank', rel: 'noopener'
          }, ['Message'])
        ])
      ])
    ]));
  });
}

async function setCustomerActive(customer, active) {
  if (state.sample) {
    customer.is_active = active;
    renderAll();
    toast('Sample data — nothing was saved.', 'info');
    return;
  }
  const { error } = await supabase.from('profiles')
    .update({ is_active: active }).eq('id', customer.id);
  if (error) { toast('Could not update: ' + error.message, 'error'); await loadAll(); return; }
  customer.is_active = active;
  toast(active ? 'Account switched on.' : 'Account switched off.', 'success');
  renderAll();
}

/* --------------------------------------------------------------------------
   Placeholder cards for tables that do not exist yet
   -------------------------------------------------------------------------- */
function missingCard(name, title, body) {
  return el('section', { class: 'admin-card' }, [
    el('h2', { class: 'admin-card-title', text: title }),
    el('p', { class: 'admin-card-note', text: body }),
    el('p', { class: 'admin-hint', text: 'Table: public.' + name })
  ]);
}

function errorCard(name, message) {
  return el('section', { class: 'admin-card' }, [
    el('h2', { class: 'admin-card-title', text: 'Could not load ' + name }),
    el('p', { class: 'admin-card-note', text: message || 'Unknown error.' })
  ]);
}

/* --------------------------------------------------------------------------
   Go
   -------------------------------------------------------------------------- */
boot();
