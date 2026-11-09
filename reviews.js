/* ==========================================================================
   Customer reviews — index.html (a preview) and clients.html (all reviews).

   Reads approved reviews from public.alm_reviews and lets visitors submit
   their own. Submissions are always stored unapproved; they appear only after
   the owner approves them in the admin panel. Row level security and a
   database trigger enforce that, whatever this file does.

   Everything is rendered with DOM text (never innerHTML), so a review can
   never inject markup. If the table has not been created yet, the friendly
   empty state that ships in the HTML simply stays in place.
   ========================================================================== */

import { createClient } from './vendor/supabase.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const list = document.getElementById('reviewsList');
const form = document.getElementById('reviewForm');
const supabase = (list || form) ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const SVG_NS = 'http://www.w3.org/2000/svg';
const STAR_PATH = 'M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95L12 2.6z';

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function star(filled) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', filled ? 'currentColor' : 'none');
  if (!filled) { svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.5'); }
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', STAR_PATH);
  svg.append(path);
  return svg;
}

function stars(rating) {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  const row = make('div', 'stars');
  row.setAttribute('role', 'img');
  row.setAttribute('aria-label', n + ' out of 5 stars');
  for (let i = 1; i <= 5; i += 1) row.append(star(i <= n));
  return row;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' :
    date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function initials(name) {
  return String(name || '').trim().split(/\s+/).slice(0, 2)
    .map((word) => Array.from(word)[0] || '').join('').toUpperCase() || '★';
}

function reviewCard(review) {
  const card = make('figure', 'testimonial');
  card.append(stars(review.rating));
  card.append(make('blockquote', null, review.body));
  const author = make('figcaption', 'testimonial-author');
  const avatar = make('span', 'author-avatar', initials(review.name));
  avatar.setAttribute('aria-hidden', 'true');
  const who = make('span');
  who.append(make('span', 'author-name', review.name));
  const role = make('span', 'author-role');
  const time = make('time', null, formatDate(review.created_at));
  time.setAttribute('datetime', String(review.created_at || '').slice(0, 10));
  if (review.city) role.append(document.createTextNode(review.city + ' · '));
  role.append(time);
  who.append(role);
  author.append(avatar, who);
  card.append(author);
  return card;
}

function renderSummary(reviews) {
  const summary = document.getElementById('reviewsSummary');
  if (!summary || !reviews.length) return;
  const average = reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length;
  summary.replaceChildren(
    stars(average),
    make('strong', null, average.toFixed(1) + ' out of 5'),
    document.createTextNode('· ' + reviews.length + (reviews.length === 1 ? ' review' : ' reviews'))
  );
  summary.hidden = false;
}

async function loadReviews() {
  if (!list) return;
  const limit = Math.max(1, parseInt(list.dataset.limit || '6', 10));
  try {
    const { data, error } = await supabase
      .from('alm_reviews')
      .select('id, name, city, rating, body, created_at')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    const reviews = (data || []).filter((r) => r && r.name && r.body);
    if (!reviews.length) return; // keep the "Be the first" empty state
    renderSummary(reviews);
    list.replaceChildren(...reviews.slice(0, limit).map(reviewCard));
    const more = document.getElementById('reviewsMore');
    if (more && reviews.length > limit) more.hidden = false;
  } catch (error) {
    console.warn('[alm] reviews not loaded:', error.message || error,
      '\nRun supabase/RUN_THIS_IN_SQL_EDITOR.sql to create the reviews table.');
  } finally {
    list.setAttribute('aria-busy', 'false');
  }
}

/* ------------------------------ Write a review ------------------------------ */
function setupForm() {
  if (!form) return;
  const details = document.getElementById('writeReview');
  const link = document.getElementById('writeReviewLink');
  const status = document.getElementById('reviewStatus');
  const submit = document.getElementById('reviewSubmit');
  const name = document.getElementById('reviewName');
  const city = document.getElementById('reviewCity');
  const body = document.getElementById('reviewBody');
  const count = document.getElementById('reviewCount');
  const honeypot = document.getElementById('reviewWebsite');
  const ratingGroup = document.getElementById('reviewRatingGroup');

  if (link && details) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      details.open = true;
      details.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => name.focus({ preventScroll: true }), 350);
    });
  }

  const updateCount = () => { count.textContent = body.value.trim().length + ' / 600'; };
  body.addEventListener('input', updateCount);
  updateCount();

  const mark = (group, bad) => group.classList.toggle('invalid', bad);
  [name, city, body].forEach((control) => control.addEventListener('input', () => mark(control.closest('.form-group'), false)));
  form.addEventListener('change', (event) => { if (event.target.name === 'rating') mark(ratingGroup, false); });

  function show(message, isError) {
    status.textContent = message;
    status.classList.toggle('is-error', Boolean(isError));
    status.classList.add('show');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.classList.remove('show', 'is-error');

    const values = {
      name: name.value.replace(/\s+/g, ' ').trim(),
      city: city.value.replace(/\s+/g, ' ').trim(),
      body: body.value.trim(),
      rating: parseInt((form.querySelector('input[name="rating"]:checked') || {}).value || '0', 10)
    };
    const checks = [
      [name.closest('.form-group'), values.name.length < 2 || values.name.length > 60 || /[<>]/.test(values.name)],
      [city.closest('.form-group'), values.city.length > 60 || /[<>]/.test(values.city)],
      [ratingGroup, !(values.rating >= 1 && values.rating <= 5)],
      [body.closest('.form-group'), values.body.length < 10 || values.body.length > 600]
    ];
    checks.forEach(([group, bad]) => mark(group, bad));
    const firstBad = checks.find(([, bad]) => bad);
    if (firstBad) {
      const target = firstBad[0].querySelector('input, textarea');
      if (target) target.focus();
      return;
    }

    const thanks = 'Thank you, your review will appear after approval.';

    // Bots fill every field. Pretend it worked and send nothing.
    if (honeypot && honeypot.value) { form.reset(); updateCount(); show(thanks); return; }

    submit.disabled = true;
    const label = submit.textContent;
    submit.textContent = 'Sending…';
    try {
      const { error } = await supabase.from('alm_reviews').insert({
        name: values.name,
        city: values.city || null,
        rating: values.rating,
        body: values.body,
        approved: false
      });
      if (error) throw error;
      form.reset();
      updateCount();
      show(thanks);
    } catch (error) {
      console.warn('[alm] review not saved:', error.message || error);
      const limited = /too many/i.test(error.message || '');
      show(limited
        ? 'You have sent a few reviews already. Please try again a little later.'
        : 'Sorry, we could not save your review just now. Please try again later, or review us on Google.', true);
    } finally {
      submit.disabled = false;
      submit.textContent = label;
    }
  });
}

setupForm();
loadReviews();
