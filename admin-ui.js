/* Small, dependency-free UI primitives for the admin panel. */
let sequence = 0;
export const $ = (selector, context = document) => context.querySelector(selector);
export const clear = (node) => node.replaceChildren();

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (value == null || value === false) return;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value === true ? '' : value);
  });
  children.forEach((child) => {
    if (child != null && child !== false) node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return node;
}

export function field(label, control, hint) {
  if (!control.id) control.id = 'admin-field-' + (++sequence);
  return el('div', { class: 'admin-field' }, [
    el('label', { for: control.id, text: label }), control,
    hint ? el('p', { class: 'admin-hint', text: hint }) : null
  ]);
}

export function input(value = '', props = {}) {
  const node = el('input', { type: 'text', ...props });
  node.value = value == null ? '' : String(value);
  return node;
}

export function textarea(value = '', rows = 4, props = {}) {
  const node = el('textarea', { rows, ...props });
  node.value = value || '';
  return node;
}

export function select(options, value) {
  return el('select', {}, Object.entries(options).map(([key, label]) =>
    el('option', { value: key, selected: key === value }, [label])));
}

export function formError(form, message) {
  let node = form.querySelector('.admin-form-error');
  if (!node) {
    node = el('p', { class: 'admin-message admin-form-error', role: 'alert', hidden: true });
    form.prepend(node);
  }
  node.textContent = message || '';
  node.hidden = !message;
  node.dataset.state = 'error';
  if (message) node.scrollIntoView({ block: 'nearest' });
}

export async function saving(button, label, action) {
  if (button.disabled) return;
  const original = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try { return await action(); }
  catch (error) { toast('Something went wrong: ' + (error.message || 'please try again.'), 'error'); }
  finally { button.disabled = false; button.textContent = original; }
}

let toastTimer;
export function toast(message, kind = 'info') {
  const node = $('#toast');
  if (!node) return;
  node.textContent = message;
  node.dataset.kind = kind;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.hidden = true; }, 4800);
}

let closeModal = null;
export function openModal(title, body, footer) {
  if (closeModal) closeModal();
  const root = $('#modalRoot');
  const previousFocus = document.activeElement;
  const previousOverflow = document.body.style.overflow;
  const background = [...document.querySelectorAll('.admin-bar, .admin-main')];
  const dialog = el('div', { class: 'admin-modal-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, [
    el('div', { class: 'admin-modal-head' }, [
      el('h2', { class: 'admin-modal-title', text: title }),
      el('button', { class: 'admin-modal-x', type: 'button', 'aria-label': 'Close dialog', onclick: () => close() }, ['×'])
    ]),
    el('div', { class: 'admin-modal-body' }, [body]),
    footer ? el('div', { class: 'admin-modal-foot' }, [footer]) : null
  ]);
  const backdrop = el('div', { class: 'admin-modal', onclick: (event) => { if (event.target === backdrop) close(); } }, [dialog]);
  function onKey(event) {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key !== 'Tab') return;
    const nodes = [...dialog.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
      .filter((node) => node.getClientRects().length);
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  function close() {
    root.replaceChildren();
    document.removeEventListener('keydown', onKey);
    background.forEach((node) => { node.inert = false; });
    document.body.style.overflow = previousOverflow;
    closeModal = null;
    if (previousFocus?.isConnected) previousFocus.focus();
  }
  clear(root);
  root.append(backdrop);
  background.forEach((node) => { node.inert = true; });
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKey);
  closeModal = close;
  (dialog.querySelector('input:not(:disabled), textarea, select') || dialog.querySelector('button')).focus();
  return { close, dialog };
}

export function confirmModal(title, message, label, action) {
  const confirm = el('button', { class: 'admin-btn admin-btn-danger', type: 'button',
    onclick: () => saving(confirm, 'Working…', async () => { if (await action() !== false) modal.close(); }) }, [label]);
  const modal = openModal(title, el('p', { class: 'admin-modal-text', text: message }),
    el('div', { class: 'admin-modal-actions' }, [
      el('button', { class: 'admin-btn', type: 'button', onclick: () => modal.close() }, ['Cancel']), confirm
    ]));
  return modal;
}

export function detailRow(label, value) {
  return el('div', { class: 'admin-detail-row' }, [el('dt', { text: label }), el('dd', { text: value || '—' })]);
}

export function download(text, filename, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = el('a', { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ago(value) {
  if (!value) return 'Never';
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (!Number.isFinite(minutes)) return '—';
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return minutes + ' min ago';
  if (minutes < 1440) return Math.floor(minutes / 60) + ' hr ago';
  return formatDate(value);
}

export function isMissingRelation(error) {
  return ['42P01', 'PGRST205', 'PGRST202'].includes(String(error?.code)) ||
    /does not exist|could not find the table|could not find the function|schema cache/i.test(error?.message || '');
}

export function databaseError(error) {
  if (error?.code === '23505') return 'That URL ID, SKU, email or slug is already in use. Choose a unique one.';
  if (error?.code === '42501') return 'Your account does not have permission to save this change. Check the admin allow-list and migration.';
  if (isMissingRelation(error)) return 'The database update has not been installed. Run the stock, customers and posts migration, then refresh.';
  return error?.message || 'Could not save. Check your connection and try again.';
}

export function missingCard(title, migrationOnly = false) {
  return el('section', { class: 'admin-card admin-empty-state' }, [
    el('span', { class: 'admin-eyebrow', text: 'ONE-TIME SETUP' }),
    el('h2', { class: 'admin-card-title', text: title }),
    el('p', { class: 'admin-card-note', text: migrationOnly
      ? 'Run supabase/migrations/202610290001_stock_customers_posts.sql in the SQL editor of the Supabase project configured in supabase-config.js, then refresh. For a new project, run supabase/schema.sql first.'
      : 'Run supabase/schema.sql in your Supabase SQL editor, then refresh this page.' }),
    el('p', { class: 'admin-hint', text: 'No live database changes are made by this preview. You can explore all features with sample data.' })
  ]);
}

export function errorCard(name, message, retry) {
  return el('section', { class: 'admin-card' }, [
    el('h2', { class: 'admin-card-title', text: 'Could not load ' + name }),
    el('p', { class: 'admin-card-note', text: message || 'Check your connection and try again.' }),
    retry ? el('button', { class: 'admin-btn', type: 'button', onclick: retry }, ['Try again']) : null
  ]);
}

export function statusPill(status, label = status, tone = 'neutral') {
  return el('span', { class: 'admin-pill', dataset: { status, tone }, text: label });
}
