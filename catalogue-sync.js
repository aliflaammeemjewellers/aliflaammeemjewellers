/* ==========================================================================
   Live catalogue — collections.html, index.html and every piece page.

   The catalogue in build.py is the source of truth for the generated pages.
   This module is an optional layer on top: when the public.pieces table exists
   (see supabase/schema.sql), whatever the admin panel has saved there wins.

   It can:
     - rewrite names, descriptions, badges, tags and specs,
     - reorder the grid to match the sort order set in the panel,
     - hide a piece the panel has marked unavailable,
     - show a piece that was added in the panel and does not exist in build.py.

   It is progressive enhancement in the strict sense: if the table is missing,
   the request fails, or the network is down, nothing here runs and the page
   stays exactly as build.py generated it.
   ========================================================================== */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const esc = (s) => String(s == null ? '' : s);

function island() {
  const node = document.getElementById('catalogue-data');
  if (!node) return null;
  try {
    return JSON.parse(node.textContent);
  } catch (err) {
    return null;
  }
}

/* --- row -> catalogue item ------------------------------------------------ */
function toItem(row, maps) {
  const metals = (row.metals || []).map((m) => maps.metals[m] || m);
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    occasion: row.occasion,
    metals: metals,
    badge: row.badge || '',
    desc: row.description || '',
    story: row.story || '',
    tags: row.tags || [],
    specs: row.specs || [],
    motif: row.motif,
    photo: row.photo || null,
    href: 'piece-' + row.id + '.html',
    _featured: !!row.featured
  };
}

/* --- markup, mirroring card() in build.py --------------------------------- */
function media(item, maps) {
  if (item.photo) {
    return '<img class="product-photo" src="' + esc(item.photo) + '" alt="' +
      esc(item.name) + '" loading="lazy" decoding="async">';
  }
  return maps.motifs[item.motif] || '';
}

function cardHtml(item, maps) {
  const badgeCls = (item.badge === 'Bestseller' || item.badge === 'Signature')
    ? 'badge gold' : 'badge';
  const badge = item.badge
    ? '\n          <span class="' + badgeCls + '">' + esc(item.badge) + '</span>' : '';
  const tags = (item.tags || [])
    .map((t) => '\n              <span class="tag">' + esc(t) + '</span>').join('');
  const metals = (item.metals || []).join(' · ');
  const typeLabel = maps.types[item.type] || item.type;
  const occLabel = maps.occasions[item.occasion] || item.occasion || '';

  return '' +
    '<article class="product-card" data-type="' + esc(item.type) + '" data-piece="' + esc(item.id) + '">' +
    '  <div class="product-media">' + badge +
    '    <a class="media-link" href="' + esc(item.href) + '" tabindex="-1" aria-hidden="true">' + media(item, maps) + '</a>' +
    '    <button class="quickview-btn" type="button" data-quickview="' + esc(item.id) + '"' +
    '            aria-label="View all details for ' + esc(item.name) + '">View details</button>' +
    '    <button class="fav-btn" type="button" aria-label="Save ' + esc(item.name) + ' to wishlist"' +
    '            aria-pressed="false" data-fav="' + esc(item.id) + '">' + (maps.icons ? maps.icons.heart : '') + '</button>' +
    '  </div>' +
    '  <div class="product-body">' +
    '    <span class="product-cat">' + esc(typeLabel) + (occLabel ? ' · ' + esc(occLabel) : '') + '</span>' +
    '    <h3 class="product-name"><a href="' + esc(item.href) + '">' + esc(item.name) + '</a></h3>' +
    '    <p class="product-desc">' + esc(item.desc) + '</p>' +
    '    <div class="product-meta">' + tags +
    '      <span class="tag">' + esc(metals) + '</span>' +
    '    </div>' +
    '    <div class="product-foot">' +
    '      <button class="enquire-btn" type="button" data-enquire="' + esc(item.name) + '">Enquire ' +
    (maps.icons ? maps.icons.arrow : '') + '</button>' +
    '    </div>' +
    '  </div>' +
    '</article>';
}

/* --- the three places a piece appears ------------------------------------- */
function renderGrid(grid, items, maps) {
  if (!grid) return;
  grid.innerHTML = items.map((i) => cardHtml(i, maps)).join('\n');
}

function patchSpotlight(el, item) {
  const name = el.querySelector('.spotlight-name a');
  const desc = el.querySelector('.spotlight-desc');
  if (name) name.textContent = item.name;
  if (desc) desc.textContent = item.story || item.desc;

  const dl = el.querySelector('.spotlight-specs');
  if (dl && Array.isArray(item.specs)) {
    dl.innerHTML = item.specs
      .map((s) => '<div class="spec"><dt>' + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd></div>')
      .join('');
  }
}

function patchPiecePage(el, item, maps) {
  const eyebrow = el.querySelector('.piece-eyebrow');
  const typeLabel = maps.types[item.type] || item.type;
  const occLabel = maps.occasions[item.occasion] || '';
  if (eyebrow) eyebrow.textContent = occLabel ? typeLabel + ' · ' + occLabel : typeLabel;

  const name = el.querySelector('.piece-name');
  if (name) name.textContent = item.name;
  const lede = el.querySelector('.piece-lede');
  if (lede) lede.textContent = item.story || item.desc;

  const dl = el.querySelector('.piece-specs');
  if (dl && Array.isArray(item.specs)) {
    dl.innerHTML = item.specs
      .map((s) => '<div class="spec"><dt>' + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd></div>')
      .join('');
  }

  const tagBox = el.querySelector('.piece-tags');
  if (tagBox) {
    tagBox.innerHTML = (item.tags || [])
      .map((t) => '<span class="tag">' + esc(t) + '</span>').join('') +
      '<span class="tag">' + esc((item.metals || []).join(' · ')) + '</span>';
  }

  // The WhatsApp button carries the name, so it has to move with the piece.
  const enquire = el.querySelector('[data-enquire]');
  if (enquire) enquire.dataset.enquire = item.name;
}

/* --- main ---------------------------------------------------------------- */
async function main() {
  const maps = island();
  if (!maps) return;

  const { data, error } = await supabase
    .from('pieces')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  // No table, no permission, offline: the page stays as build.py generated it.
  if (error || !Array.isArray(data) || !data.length) return;

  // Row level security already hides these from anonymous visitors. Filtering
  // again here means a piece marked unavailable can never be displayed, even
  // if the policy is later relaxed or someone signs in on the public site.
  const items = data
    .filter((row) => row.visible !== false)
    .map((row) => toItem(row, maps));

  if (!items.length) return;
  const byId = new Map(items.map((i) => [i.id, i]));

  // Keep the quick-view modal in step with the live catalogue.
  maps.items = items;
  const node = document.getElementById('catalogue-data');
  if (node) node.textContent = JSON.stringify(maps);

  // Full catalogue grid (collections.html).
  const grid = document.getElementById('productsGrid');
  if (grid) renderGrid(grid, items, maps);

  // Home page favourites: only the pieces flagged featured.
  const featured = document.getElementById('featuredGrid');
  if (featured) {
    const featItems = items.filter((i) => i._featured);
    if (featItems.length) renderGrid(featured, featItems, maps);
  }

  // The featured panel, and the detail page for the piece you are looking at.
  const spotlight = document.getElementById('spotlight');
  if (spotlight) {
    const item = byId.get(spotlight.dataset.piece);
    if (item) patchSpotlight(spotlight, item);
    else spotlight.hidden = true;
  }

  document.querySelectorAll('.piece[data-piece]').forEach((el) => {
    const item = byId.get(el.dataset.piece);
    if (item) patchPiecePage(el, item, maps);
  });

  // Related-pieces grids on the detail pages: patch the cards that still
  // exist, drop the ones the panel has hidden.
  document.querySelectorAll('.products-grid').forEach((g) => {
    if (g === grid || g === featured) return;
    g.querySelectorAll('.product-card[data-piece]').forEach((c) => {
      if (!byId.has(c.dataset.piece)) c.remove();
    });
  });

  // Let script.js re-run its filters and progressive reveal over the new DOM.
  window.dispatchEvent(new Event('alm:catalogue-updated'));
}

main();
