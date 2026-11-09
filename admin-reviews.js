/* Admin: customer reviews. Pending reviews first; approve, hide or delete.
   Rendered with DOM text only (see tests/security.test.js). */
import { $, el, clear, input, saving, toast, confirmModal, formatDateTime, ago,
  databaseError, errorCard, statusPill } from './admin-ui.js';

const FILTERS = { all: 'All', pending: 'Pending', approved: 'Published' };

function starsText(rating) {
  const n = Math.max(0, Math.min(5, Number(rating) || 0));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

export function sortReviews(rows) {
  return [...rows].sort((a, b) => (a.approved === b.approved ? 0 : a.approved ? 1 : -1) ||
    String(b.created_at || '').localeCompare(String(a.created_at || '')));
}

function reviewsMissingCard() {
  return el('section', { class: 'admin-card admin-empty-state' }, [
    el('span', { class: 'admin-eyebrow', text: 'ONE-TIME SETUP' }),
    el('h2', { class: 'admin-card-title', text: 'Turn on website reviews' }),
    el('p', { class: 'admin-card-note', text: 'Run supabase/RUN_THIS_IN_SQL_EDITOR.sql in the SQL editor of the Supabase project configured in supabase-config.js, then refresh. Until then the website shows “Be the first to share your experience”.' })
  ]);
}

export function renderReviews(ctx) {
  const { state } = ctx;
  const panel = $('#panelReviews');
  clear(panel);
  if (state.ready.reviews === 'missing') { panel.append(reviewsMissingCard()); return; }
  if (state.ready.reviews === 'error') { panel.append(errorCard('reviews', state.errors.reviews, ctx.refresh)); return; }

  const pending = state.reviews.filter((row) => !row.approved).length;
  const count = el('p', { class: 'admin-card-note', role: 'status' });
  const list = el('div', { class: 'admin-review-list' });
  const search = input(state.reviewSearch, { type: 'search', class: 'admin-search', placeholder: 'Search name, city or review', 'aria-label': 'Search reviews',
    oninput: (event) => { state.reviewSearch = event.target.value; fill(); } });
  const filters = el('div', { class: 'admin-segmented', role: 'group', 'aria-label': 'Filter reviews' },
    Object.entries(FILTERS).map(([key, label]) => el('button', {
      class: 'admin-seg' + (state.reviewFilter === key ? ' active' : ''), type: 'button', 'aria-pressed': state.reviewFilter === key,
      onclick: () => { state.reviewFilter = key; renderReviews(ctx); }
    }, [key === 'pending' && pending ? label + ' (' + pending + ')' : label])));

  panel.append(el('section', { class: 'admin-card' }, [
    el('div', { class: 'admin-card-head' }, [el('h2', { class: 'admin-card-title', text: 'Website reviews' }), count]),
    el('p', { class: 'admin-hint', text: 'New reviews stay hidden until you approve them. Approved reviews appear on the home page and the Reviews page.' }),
    el('div', { class: 'admin-toolbar' }, [filters, search]),
    list
  ]));

  function fill() {
    clear(list);
    const q = (state.reviewSearch || '').trim().toLowerCase();
    const rows = sortReviews(state.reviews).filter((row) =>
      (state.reviewFilter === 'all' || (state.reviewFilter === 'pending' ? !row.approved : row.approved)) &&
      (!q || [row.name, row.city, row.body].filter(Boolean).join(' ').toLowerCase().includes(q)));
    count.textContent = rows.length + ' of ' + state.reviews.length + ' reviews · ' + pending + ' pending';
    if (!rows.length) { list.append(el('p', { class: 'admin-empty', text: state.reviews.length ? 'No reviews match this view.' : 'No reviews yet. They will appear here as clients submit them.' })); return; }
    rows.forEach((row) => {
      const actions = el('div', { class: 'admin-actions' }, [
        row.approved
          ? el('button', { class: 'admin-btn admin-btn-small', type: 'button', onclick: (event) => setApproved(ctx, row, false, event.currentTarget) }, ['Hide'])
          : el('button', { class: 'admin-btn admin-btn-small admin-btn-primary', type: 'button', onclick: (event) => setApproved(ctx, row, true, event.currentTarget) }, ['Approve']),
        el('button', { class: 'admin-btn admin-btn-small admin-btn-danger-quiet', type: 'button', onclick: () => deleteReview(ctx, row) }, ['Delete'])
      ]);
      list.append(el('article', { class: 'admin-review' + (row.approved ? '' : ' is-pending') }, [
        el('div', { class: 'admin-review-head' }, [
          el('div', {}, [
            el('p', { class: 'admin-review-name', text: row.name + (row.city ? ' · ' + row.city : '') }),
            el('p', { class: 'admin-sub', title: formatDateTime(row.created_at), text: 'Submitted ' + ago(row.created_at) })
          ]),
          row.approved ? statusPill('approved', 'Published', 'success') : statusPill('pending', 'Pending', 'warning')
        ]),
        el('p', { class: 'admin-review-stars', 'aria-label': (row.rating || 0) + ' out of 5 stars', text: starsText(row.rating) }),
        el('p', { class: 'admin-review-body', text: row.body }),
        actions
      ]));
    });
  }
  fill();
}

async function setApproved(ctx, row, approved, control) {
  const { state, supabase } = ctx;
  await saving(control, 'Saving…', async () => {
    if (!state.sample) {
      const { error } = await supabase.from('alm_reviews').update({ approved }).eq('id', row.id);
      if (error) { toast(databaseError(error), 'error'); return; }
    } else row.approved = approved;
    toast(approved ? 'Review published on the website.' : 'Review hidden from the website.', 'success');
    await ctx.refresh();
  });
}

function deleteReview(ctx, row) {
  const { state, supabase } = ctx;
  confirmModal('Delete this review?', 'Remove the review from ' + row.name + '? This cannot be undone.', 'Delete review', async () => {
    if (!state.sample) {
      const { error } = await supabase.from('alm_reviews').delete().eq('id', row.id);
      if (error) { toast(databaseError(error), 'error'); return false; }
    } else state.reviews = state.reviews.filter((item) => item.id !== row.id);
    toast('Review deleted.', 'success');
    await ctx.refresh();
  });
}
