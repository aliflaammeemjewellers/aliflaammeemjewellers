import { $, el, clear, field, input, textarea, select, formError, saving, toast,
  openModal, confirmModal, download, formatDate, ago, databaseError,
  missingCard, errorCard, statusPill } from './admin-ui.js';
import { POST_CATEGORIES, validateCustomer, validatePost, slugify, safeImage, toCsv } from './admin-model.js';

const sampleId = (prefix) => prefix + '-' + (globalThis.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2));
const matches = (row, query, keys) => !query || keys.map((key) => row[key] || '').join(' ').toLowerCase().includes(query.toLowerCase().trim());

function emptyRow(columns, text) {
  return el('tr', {}, [el('td', { colspan: columns }, [el('p', { class: 'admin-empty', text })])]);
}

function button(label, action, className = '') {
  return el('button', { class: 'admin-btn admin-btn-small ' + className, type: 'button', onclick: action }, [label]);
}

/* -------------------------- Customer records -------------------------- */
export function renderCustomers(ctx) {
  const { state } = ctx;
  const panel = $('#panelCustomers');
  clear(panel);
  if (state.ready.customers === 'missing') { panel.append(missingCard('Connect your customer book', true)); return; }
  if (state.ready.customers === 'error') { panel.append(errorCard('customers', state.errors.customers, ctx.refresh)); return; }

  const search = input(state.custSearch, { type: 'search', class: 'admin-search', placeholder: 'Search name, phone, email or notes', 'aria-label': 'Search customer records',
    oninput: (event) => { state.custSearch = event.target.value; fillRows(); } });
  const count = el('p', { class: 'admin-card-note', role: 'status' });
  const body = el('tbody');
  const card = el('section', { class: 'admin-card' }, [
    el('div', { class: 'admin-card-head' }, [
      el('h2', { class: 'admin-card-title', text: 'Customer records' }),
      el('div', { class: 'admin-card-actions' }, [
        button('Export records', () => exportCustomers(state.customers), 'admin-btn-quiet'),
        button('+ Add customer', () => editCustomer(ctx), 'admin-btn-primary')
      ])
    ]),
    el('p', { class: 'admin-card-note', text: 'Your private customer book. Keep contact details, preferences and follow-up notes in one place. Adding a record does not create a website login.' }),
    el('div', { class: 'admin-toolbar' }, [search, count]),
    el('div', { class: 'admin-table-wrap' }, [el('table', { class: 'admin-table' }, [
      el('thead', {}, [el('tr', {}, ['Customer', 'Contact', 'Notes', 'Added', 'Actions'].map((label) => el('th', { text: label })))]), body
    ])])
  ]);
  panel.append(card);

  function fillRows() {
    clear(body);
    const rows = state.customers.filter((row) => matches(row, state.custSearch, ['full_name', 'email', 'phone', 'notes']));
    count.textContent = rows.length + ' of ' + state.customers.length + ' records';
    if (!rows.length) { body.append(emptyRow(5, state.custSearch ? 'No customers match your search.' : 'Your customer book is ready. Add your first customer.')); return; }
    rows.forEach((customer) => {
      const phone = String(customer.phone || '').replace(/[^\d+]/g, '');
      body.append(el('tr', {}, [
        el('td', {}, [
          el('button', { class: 'admin-linklike', type: 'button', onclick: () => editCustomer(ctx, customer) }, [customer.full_name]),
          customer.address ? el('span', { class: 'admin-sub admin-clamp', text: customer.address }) : null
        ]),
        el('td', {}, [
          customer.phone ? el('a', { class: 'admin-link', href: 'tel:' + phone, text: customer.phone }) : null,
          customer.email ? el('a', { class: 'admin-sub admin-email', href: 'mailto:' + encodeURIComponent(customer.email), text: customer.email }) : null
        ]),
        el('td', {}, [el('span', { class: 'admin-clamp', text: customer.notes || 'No notes yet' })]),
        el('td', { class: 'admin-nowrap', text: formatDate(customer.created_at) }),
        el('td', {}, [el('div', { class: 'admin-actions' }, [
          button('Edit', () => editCustomer(ctx, customer)),
          customer.phone ? el('a', { class: 'admin-btn admin-btn-small', href: 'https://wa.me/' + phone.replace(/\D/g, ''), target: '_blank', rel: 'noopener' }, ['WhatsApp']) : null,
          button('Delete', () => deleteCustomer(ctx, customer), 'admin-btn-danger-quiet')
        ])])
      ]));
    });
  }
  fillRows();
  renderAccounts(ctx, panel);
}

function editCustomer(ctx, customer) {
  const record = customer || { full_name: '', phone: '', email: '', address: '', notes: '' };
  const name = input(record.full_name, { required: true, maxLength: 120, autocomplete: 'name', placeholder: 'Customer’s full name' });
  const phone = input(record.phone, { type: 'tel', maxLength: 30, autocomplete: 'tel', placeholder: '+92 300 1234567' });
  const email = input(record.email, { type: 'email', maxLength: 254, autocomplete: 'email', placeholder: 'customer@example.com' });
  const address = textarea(record.address, 2, { maxLength: 1000, autocomplete: 'street-address', placeholder: 'City or full address (optional)' });
  const notes = textarea(record.notes, 4, { maxLength: 5000, placeholder: 'Preferences, ring size, occasions or follow-up notes…' });
  const form = el('form', { class: 'admin-form', novalidate: true }, [
    field('Full name *', name),
    el('div', { class: 'admin-form-two' }, [field('Phone number', phone), field('Email address', email)]),
    el('p', { class: 'admin-hint', text: 'Include a phone number or an email address. Only administrators can see these records.' }),
    field('Address', address), field('Private notes', notes)
  ]);
  const saveButton = el('button', { class: 'admin-btn admin-btn-primary', type: 'button', onclick: () => form.requestSubmit() }, [customer ? 'Save changes' : 'Add customer']);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = validateCustomer({ full_name: name.value, phone: phone.value, email: email.value, address: address.value, notes: notes.value });
    if (result.error) { formError(form, result.error); return; }
    if (ctx.state.sample && ctx.state.customers.some((row) => row.id !== customer?.id && result.value.email && row.email?.toLowerCase() === result.value.email)) {
      formError(form, 'A customer record already uses that email address.'); return;
    }
    saving(saveButton, 'Saving…', async () => {
      if (ctx.state.sample) {
        if (customer) Object.assign(customer, result.value, { updated_at: new Date().toISOString() });
        else ctx.state.customers.unshift({ ...result.value, id: sampleId('sample-customer'), created_at: new Date().toISOString() });
      } else {
        const query = customer ? ctx.supabase.from('customers').update(result.value).eq('id', customer.id)
          : ctx.supabase.from('customers').insert(result.value);
        const { error } = await query;
        if (error) { formError(form, databaseError(error)); return; }
      }
      modal.close();
      toast(ctx.state.sample ? 'Customer saved in this preview only.' : customer ? 'Customer updated.' : 'Customer added.', 'success');
      await ctx.refresh();
    });
  });
  const modal = openModal(customer ? 'Edit customer' : 'Add a customer', form,
    el('div', { class: 'admin-modal-actions' }, [
      el('button', { class: 'admin-btn', type: 'button', onclick: () => modal.close() }, ['Cancel']), saveButton
    ]));
}

function deleteCustomer(ctx, customer) {
  confirmModal('Delete customer record?', 'Remove ' + customer.full_name + ' and their private notes from your customer book? This does not delete a website account or appointment history.', 'Delete record', async () => {
    if (!ctx.state.sample) {
      const { error } = await ctx.supabase.from('customers').delete().eq('id', customer.id);
      if (error) { toast(databaseError(error), 'error'); return false; }
    } else ctx.state.customers = ctx.state.customers.filter((row) => row.id !== customer.id);
    toast(ctx.state.sample ? 'Sample record deleted.' : 'Customer record deleted.', 'success');
    await ctx.refresh();
  });
}

function exportCustomers(rows) {
  download(toCsv(rows, [
    { label: 'Name', value: (row) => row.full_name }, { label: 'Phone', value: (row) => row.phone },
    { label: 'Email', value: (row) => row.email }, { label: 'Address', value: (row) => row.address },
    { label: 'Notes', value: (row) => row.notes }, { label: 'Added', value: (row) => row.created_at }
  ]), 'alm-customer-records.csv', 'text/csv;charset=utf-8');
  toast('Customer records exported. Keep this file private.', 'success');
}

function renderAccounts(ctx, panel) {
  const { state } = ctx;
  if (state.ready.profiles !== 'ok' && state.ready.profiles !== 'sample') {
    panel.append(el('p', { class: 'admin-card-note', text: 'Website accounts are unavailable. Run the base schema to list signups; your manually managed customer records still work.' }));
    return;
  }
  const body = el('tbody');
  const search = input(state.profileSearch, { type: 'search', class: 'admin-search', placeholder: 'Search website accounts', 'aria-label': 'Search website accounts', oninput: (event) => { state.profileSearch = event.target.value; fill(); } });
  const details = el('details', { class: 'admin-card admin-accounts', open: state.accountsOpen }, [
    el('summary', {}, ['Website accounts (' + state.profiles.length + ')']),
    el('p', { class: 'admin-card-note', text: 'These profiles are created when someone signs up. The active flag is a profile label only: it does not block sign-in. Manage authentication bans in Supabase Authentication → Users.' }),
    el('div', { class: 'admin-toolbar' }, [search]),
    el('div', { class: 'admin-table-wrap' }, [el('table', { class: 'admin-table' }, [
      el('thead', {}, [el('tr', {}, ['Customer', 'Email', 'Joined', 'Last sign in', 'Active flag'].map((label) => el('th', { text: label })))]), body
    ])])
  ]);
  details.addEventListener('toggle', () => { state.accountsOpen = details.open; });
  panel.append(details);
  function fill() {
    clear(body);
    const rows = state.profiles.filter((row) => matches(row, state.profileSearch, ['full_name', 'email', 'phone']));
    if (!rows.length) { body.append(emptyRow(5, 'No matching website accounts.')); return; }
    rows.forEach((profile) => {
      const toggle = el('input', { type: 'checkbox', checked: profile.is_active !== false, 'aria-label': 'Active flag for ' + (profile.full_name || profile.email), onchange: (event) => setProfileFlag(ctx, profile, event.target) });
      body.append(el('tr', {}, [
        el('td', { text: profile.full_name || 'Unnamed customer' }),
        el('td', {}, [el('a', { class: 'admin-link admin-email', href: 'mailto:' + encodeURIComponent(profile.email || ''), text: profile.email || '—' })]),
        el('td', { class: 'admin-nowrap', text: formatDate(profile.created_at) }),
        el('td', { class: 'admin-nowrap', text: ago(profile.last_sign_in_at) }),
        el('td', {}, [el('label', { class: 'admin-switch' }, [toggle, el('span', { class: 'admin-switch-track' }), el('span', { class: 'admin-switch-label', text: profile.is_active === false ? 'Off' : 'On' })])])
      ]));
    });
  }
  fill();
}

async function setProfileFlag(ctx, profile, control) {
  control.disabled = true;
  try {
    if (!ctx.state.sample) {
      const { error } = await ctx.supabase.from('profiles').update({ is_active: control.checked }).eq('id', profile.id);
      if (error) throw error;
    }
    profile.is_active = control.checked;
    toast(ctx.state.sample ? 'Sample profile flag changed.' : 'Profile flag updated. Sign-in access was not changed.', 'success');
    await ctx.refresh();
  } catch (error) { control.checked = !control.checked; toast(databaseError(error), 'error'); }
  finally { control.disabled = false; }
}

/* ------------------------------- Posts -------------------------------- */
export function renderPosts(ctx) {
  const { state } = ctx;
  const panel = $('#panelPosts');
  clear(panel);
  if (state.ready.posts === 'missing') { panel.append(missingCard('Bring your journal to life', true)); return; }
  if (state.ready.posts === 'error') { panel.append(errorCard('posts', state.errors.posts, ctx.refresh)); return; }
  const body = el('tbody');
  const count = el('p', { class: 'admin-card-note', role: 'status' });
  const search = input(state.postSearch, { type: 'search', class: 'admin-search', placeholder: 'Search posts', 'aria-label': 'Search posts', oninput: (event) => { state.postSearch = event.target.value; fill(); } });
  const filters = el('div', { class: 'admin-segmented', role: 'group', 'aria-label': 'Filter posts' },
    [['all', 'All posts'], ['published', 'Published'], ['draft', 'Drafts']].map(([key, label]) => el('button', {
      type: 'button', class: 'admin-seg' + (state.postFilter === key ? ' active' : ''), 'aria-pressed': state.postFilter === key,
      onclick: () => { state.postFilter = key; renderPosts(ctx); }
    }, [label])));
  panel.append(el('section', { class: 'admin-card' }, [
    el('div', { class: 'admin-card-head' }, [
      el('h2', { class: 'admin-card-title', text: 'Your house journal' }),
      el('div', { class: 'admin-card-actions' }, [
        el('a', { class: 'admin-btn admin-btn-quiet', href: 'journal.html', target: '_blank', rel: 'noopener' }, ['View journal']),
        button('+ New post', () => editPost(ctx), 'admin-btn-primary')
      ])
    ]),
    el('p', { class: 'admin-card-note', text: 'Share new arrivals, house news, offers and jewellery care. Drafts stay private until you publish. For product listings, use Stock & catalogue.' }),
    el('div', { class: 'admin-toolbar' }, [filters, search, count]),
    el('div', { class: 'admin-table-wrap' }, [el('table', { class: 'admin-table admin-posts-table' }, [
      el('thead', {}, [el('tr', {}, ['Post', 'Category', 'Status', 'Updated', 'Actions'].map((label) => el('th', { text: label })))]), body
    ])])
  ]));
  function fill() {
    clear(body);
    const rows = state.posts.filter((row) => (state.postFilter === 'all' || row.status === state.postFilter) && matches(row, state.postSearch, ['title', 'excerpt', 'body', 'category']));
    count.textContent = rows.length + ' of ' + state.posts.length + ' posts';
    if (!rows.length) { body.append(emptyRow(5, state.postSearch || state.postFilter !== 'all' ? 'No posts match this view.' : 'Your first story starts here. Write a post or save a draft.')); return; }
    rows.forEach((post) => {
      const published = post.status === 'published';
      const image = safeImage(post.image_url);
      body.append(el('tr', {}, [
        el('td', {}, [el('div', { class: 'admin-post-cell' }, [
          image ? el('img', { class: 'admin-thumb', src: image, alt: '', loading: 'lazy', onerror: (event) => { event.target.hidden = true; } }) : el('span', { class: 'admin-thumb admin-thumb-empty', 'aria-hidden': 'true' }, ['Aa']),
          el('div', {}, [el('button', { class: 'admin-linklike', type: 'button', onclick: () => editPost(ctx, post) }, [post.title]), el('span', { class: 'admin-sub admin-clamp', text: post.excerpt || 'No summary yet' })])
        ])]),
        el('td', { class: 'admin-nowrap', text: POST_CATEGORIES[post.category] || post.category }),
        el('td', {}, [statusPill(post.status, published ? 'Published' : 'Draft', published ? 'success' : 'warning')]),
        el('td', { class: 'admin-nowrap', text: formatDate(post.updated_at || post.created_at) }),
        el('td', {}, [el('div', { class: 'admin-actions' }, [
          button('Preview', () => previewPost(post)),
          button('Edit', () => editPost(ctx, post)),
          button(published ? 'Unpublish' : 'Publish', (event) => changePostStatus(ctx, post, event.currentTarget)),
          published && !ctx.state.sample ? el('a', { class: 'admin-btn admin-btn-small', href: 'journal.html?post=' + encodeURIComponent(post.slug), target: '_blank', rel: 'noopener' }, ['View']) : null,
          button('Delete', () => deletePost(ctx, post), 'admin-btn-danger-quiet')
        ])])
      ]));
    });
  }
  fill();
}

function postPreviewNode(post) {
  const image = safeImage(post.image_url);
  return el('article', { class: 'journal-article admin-post-preview' }, [
    post.status !== 'published' ? el('p', { class: 'admin-notice', text: 'Draft preview · this post is not visible on the website.' }) : null,
    el('p', { class: 'journal-category', text: POST_CATEGORIES[post.category] || 'House news' }),
    el('h2', { text: post.title || 'Untitled post' }),
    el('p', { class: 'journal-date', text: formatDate(post.published_at || new Date().toISOString()) }),
    image ? el('img', { class: 'journal-cover', src: image, alt: post.title || 'Post image', onerror: (event) => { event.target.hidden = true; } }) : null,
    post.excerpt ? el('p', { class: 'journal-standfirst', text: post.excerpt }) : null,
    el('div', { class: 'journal-body', text: post.body || 'Your story will appear here.' })
  ]);
}

function previewPost(post) {
  openModal('Post preview', postPreviewNode(post));
}

function editPost(ctx, post) {
  const record = post || { title: '', slug: '', category: 'news', excerpt: '', body: '', image_url: '', status: 'draft' };
  const title = input(record.title, { maxLength: 160, required: true, placeholder: 'Give your story a title' });
  const slug = input(record.slug, { maxLength: 100, disabled: !!post, placeholder: 'your-story-title', autocapitalize: 'none', spellcheck: false });
  let slugEdited = !!post;
  slug.addEventListener('input', () => { slugEdited = true; });
  title.addEventListener('input', () => { if (!slugEdited) slug.value = slugify(title.value); });
  const category = select(POST_CATEGORIES, record.category);
  const excerpt = textarea(record.excerpt, 2, { maxLength: 320, placeholder: 'A short introduction for the journal (optional)' });
  const image = input(record.image_url, { type: 'url', placeholder: 'https://… or assets/products/meher.webp' });
  const body = textarea(record.body, 10, { maxLength: 30000, placeholder: 'Write your update here. Leave a blank line between paragraphs.' });
  const form = el('form', { class: 'admin-form', novalidate: true }, [
    field('Title *', title), field('URL slug', slug, post ? 'The slug stays fixed so shared links keep working.' : 'Generated from the title. You can change it before saving.'),
    field('Category', category), field('Summary', excerpt, 'Up to 320 characters.'),
    field('Cover image', image, 'Optional HTTPS image URL or an existing assets/ path. Images are not uploaded by this panel.'),
    field('Post content', body, 'Plain text, with blank lines between paragraphs. Required to publish; optional for a draft.')
  ]);
  const draftLabel = post?.status === 'published' ? 'Save changes' : 'Save draft';
  const draft = el('button', { class: 'admin-btn', type: 'button', onclick: () => { publishRequested = false; form.requestSubmit(); } }, [draftLabel]);
  const publish = el('button', { class: 'admin-btn admin-btn-primary', type: 'button' }, [post?.status === 'published' ? 'Save & keep published' : 'Publish post']);
  let publishRequested = false, inFlight = false;
  publish.addEventListener('click', () => { publishRequested = true; form.requestSubmit(); });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (inFlight) return;
    const publishing = publishRequested || post?.status === 'published';
    publishRequested = false;
    const result = validatePost({ title: title.value, slug: slug.value, category: category.value, excerpt: excerpt.value, body: body.value, image_url: image.value }, publishing);
    if (result.error) { formError(form, result.error); return; }
    if (ctx.state.sample && ctx.state.posts.some((row) => row.id !== post?.id && row.slug === result.value.slug)) { formError(form, 'That slug is already used by another post.'); return; }
    inFlight = true;
    saving(publishing ? publish : draft, publishing ? 'Publishing…' : 'Saving…', async () => {
      const now = new Date().toISOString();
      const row = { ...result.value, status: publishing ? 'published' : 'draft', updated_at: now,
        published_at: publishing ? (post?.published_at || now) : null };
      if (ctx.state.sample) {
        if (post) Object.assign(post, row);
        else ctx.state.posts.unshift({ ...row, id: sampleId('sample-post'), created_at: now });
      } else {
        const query = post ? ctx.supabase.from('posts').update(row).eq('id', post.id) : ctx.supabase.from('posts').insert(row);
        const { error } = await query;
        if (error) { formError(form, databaseError(error)); return; }
      }
      modal.close();
      toast(ctx.state.sample ? 'Post saved in this preview only.' : publishing ? 'Post saved and published to the journal.' : 'Draft saved. It is not public.', 'success');
      await ctx.refresh();
    }).finally(() => { inFlight = false; draft.disabled = publish.disabled = false; });
  });
  const modal = openModal(post ? 'Edit post' : 'Write a new post', form,
    el('div', { class: 'admin-modal-actions' }, [
      el('button', { class: 'admin-btn admin-btn-quiet', type: 'button', onclick: () => modal.close() }, ['Cancel']), draft, publish
    ]));
}

async function changePostStatus(ctx, post, control) {
  await saving(control, 'Saving…', async () => {
    const now = new Date().toISOString();
    const row = { status: post.status === 'published' ? 'draft' : 'published', updated_at: now,
      published_at: post.status === 'published' ? null : now };
    if (row.status === 'published' && !post.body.trim()) { toast('Open the post and write its content before publishing.', 'error'); return; }
    if (!ctx.state.sample) {
      const { error } = await ctx.supabase.from('posts').update(row).eq('id', post.id);
      if (error) { toast(databaseError(error), 'error'); return; }
    } else Object.assign(post, row);
    toast(ctx.state.sample ? 'Sample post status changed.' : row.status === 'published' ? 'Post published.' : 'Post moved to drafts and removed from the website.', 'success');
    await ctx.refresh();
  });
}

function deletePost(ctx, post) {
  confirmModal('Delete this post?', '“' + post.title + '” will be permanently deleted' + (post.status === 'published' ? ' and removed from the website' : '') + '. To keep it for later, unpublish it instead.', 'Delete post', async () => {
    if (!ctx.state.sample) {
      const { error } = await ctx.supabase.from('posts').delete().eq('id', post.id);
      if (error) { toast(databaseError(error), 'error'); return false; }
    } else ctx.state.posts = ctx.state.posts.filter((row) => row.id !== post.id);
    toast(ctx.state.sample ? 'Sample post deleted.' : 'Post deleted.', 'success');
    await ctx.refresh();
  });
}

// Quick actions on the overview open the same validated editors as each tab.
export const openCustomerEditor = (ctx) => editCustomer(ctx);
export const openPostEditor = (ctx) => editPost(ctx);
