/* Public catalogue overlay. Reads only the non-sensitive public.catalogue view.
   Static pages remain the fallback when the database is unavailable. Successful
   live responses, including an empty catalogue, replace stale generated cards. */
import { createClient } from './vendor/supabase.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';
import { safeImage } from './admin-model.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function island() {
  try { return JSON.parse(document.getElementById('catalogue-data')?.textContent || 'null'); }
  catch { return null; }
}

function toItem(row, maps, staticIds) {
  return {
    id: row.id, name: row.name, type: row.type, occasion: row.occasion,
    metals: (row.metals || []).map((metal) => maps.metals[metal] || metal),
    badge: row.badge || '', desc: row.description || '', story: row.story || '',
    tags: row.tags || [], specs: Array.isArray(row.specs) ? row.specs : [], motif: row.motif,
    photo: safeImage(row.photo) || null, inStock: row.in_stock !== false,
    href: staticIds.has(row.id) ? 'piece-' + encodeURIComponent(row.id) + '.html' : 'piece.html?id=' + encodeURIComponent(row.id),
    _featured: !!row.featured
  };
}

function media(item, maps) {
  if (item.photo) return '<img class="product-photo" src="' + escapeHtml(item.photo) + '" alt="' + escapeHtml(item.name) + '" loading="lazy" decoding="async">';
  return maps.motifs[item.motif] || maps.motifs.rings || '';
}

function cardHtml(item, maps) {
  const e = escapeHtml;
  const badge = item.badge ? '<span class="badge' + (['Bestseller', 'Signature'].includes(item.badge) ? ' gold' : '') + '">' + e(item.badge) + '</span>' : '';
  const tags = item.tags.map((tag) => '<span class="tag">' + e(tag) + '</span>').join('');
  const typeLabel = maps.types[item.type] || item.type;
  const occLabel = maps.occasions[item.occasion] || item.occasion || '';
  return '<article class="product-card" data-type="' + e(item.type) + '" data-piece="' + e(item.id) + '">' +
    '<div class="product-media">' + badge +
    '<a class="media-link" href="' + e(item.href) + '" tabindex="-1" aria-hidden="true">' + media(item, maps) + '</a>' +
    '<button class="quickview-btn" type="button" data-quickview="' + e(item.id) + '" aria-label="View all details for ' + e(item.name) + '">View details</button>' +
    '<button class="fav-btn" type="button" aria-label="Save ' + e(item.name) + ' to wishlist" aria-pressed="false" data-fav="' + e(item.id) + '">' + (maps.icons?.heart || '') + '</button></div>' +
    '<div class="product-body"><span class="product-cat">' + e(typeLabel) + (occLabel ? ' · ' + e(occLabel) : '') + '</span>' +
    '<h3 class="product-name"><a href="' + e(item.href) + '">' + e(item.name) + '</a></h3>' +
    '<p class="product-desc">' + e(item.desc) + '</p><div class="product-meta">' + tags + '<span class="tag">' + e(item.metals.join(' · ')) + '</span></div>' +
    (!item.inStock ? '<p class="product-availability">Currently unavailable · ask about the next arrival</p>' : '') +
    '<div class="product-foot"><button class="enquire-btn" type="button" data-enquire="' + e(item.name) + '">' + (item.inStock ? 'Enquire' : 'Ask about availability') + ' ' + (maps.icons?.arrow || '') + '</button></div></div></article>';
}

function renderGrid(grid, items, maps) {
  if (grid) grid.innerHTML = items.map((item) => cardHtml(item, maps)).join('\n');
}

function specsHtml(item) {
  return item.specs.filter((pair) => Array.isArray(pair) && pair.length >= 2)
    .map((pair) => '<div class="spec"><dt>' + escapeHtml(pair[0]) + '</dt><dd>' + escapeHtml(pair[1]) + '</dd></div>').join('');
}
function tagsHtml(item) {
  return item.tags.map((tag) => '<span class="tag">' + escapeHtml(tag) + '</span>').join('') + '<span class="tag">' + escapeHtml(item.metals.join(' · ')) + '</span>';
}

function patchSpotlight(node, item, maps) {
  node.dataset.type = item.type;
  const name = node.querySelector('.spotlight-name a');
  if (name) { name.textContent = item.name; name.href = item.href; }
  const desc = node.querySelector('.spotlight-desc');
  if (desc) desc.textContent = item.story || item.desc;
  const photo = node.querySelector('.spotlight-media');
  if (photo) photo.innerHTML = media(item, maps);
  const specs = node.querySelector('.spotlight-specs');
  if (specs) specs.innerHTML = specsHtml(item);
  const view = node.querySelector('.spotlight-foot a');
  if (view) view.href = item.href;
}

function patchPiecePage(node, item, maps) {
  const typeLabel = maps.types[item.type] || item.type;
  const occLabel = maps.occasions[item.occasion] || item.occasion || '';
  const eyebrow = node.querySelector('.piece-eyebrow');
  if (eyebrow) eyebrow.textContent = occLabel ? typeLabel + ' · ' + occLabel : typeLabel;
  const name = node.querySelector('.piece-name');
  if (name) name.textContent = item.name;
  const lede = node.querySelector('.piece-lede');
  if (lede) lede.textContent = item.story || item.desc;
  const specs = node.querySelector('.piece-specs');
  if (specs) specs.innerHTML = specsHtml(item);
  const tags = node.querySelector('.piece-tags');
  if (tags) tags.innerHTML = tagsHtml(item);
  const enquire = node.querySelector('[data-enquire]');
  if (enquire) { enquire.dataset.enquire = item.name; if (!item.inStock) enquire.textContent = 'Ask about availability'; }
  const note = node.querySelector('.piece-note');
  if (note && !item.inStock) note.textContent = 'This piece is currently unavailable. Ask us about the next arrival or a made-to-order commission.';
  const photo = node.querySelector('.piece-media');
  if (photo) photo.innerHTML = media(item, maps);
}

function dynamicState(title, message) {
  const node = document.getElementById('dynamicPieceState');
  if (!node) return;
  node.hidden = false;
  node.replaceChildren();
  const heading = document.createElement('h1'); heading.textContent = title;
  const text = document.createElement('p'); text.textContent = message;
  const link = document.createElement('a'); link.href = 'collections.html'; link.className = 'btn btn-primary'; link.textContent = 'Back to collections';
  node.append(heading, text, link);
  document.querySelectorAll('[data-dynamic-piece], #dynamicRelated').forEach((section) => { section.hidden = true; });
}

function renderDynamicPiece(item, items, maps) {
  const node = document.querySelector('[data-dynamic-piece]');
  if (!node) return;
  if (!item) { dynamicState('This piece is unavailable.', 'It may have been removed or hidden. Explore the rest of the collection, or ask our team about a similar piece.'); return; }
  node.dataset.piece = item.id;
  patchPiecePage(node, item, maps);
  node.hidden = false;
  node.querySelectorAll('[data-aos]').forEach((element) => element.classList.add('aos-in'));
  document.getElementById('dynamicPieceState').hidden = true;
  document.getElementById('dynamicPieceSection').hidden = false;
  const crumb = document.getElementById('dynamicCrumb');
  if (crumb) crumb.textContent = item.name;
  document.title = item.name + ' | Alif Laam Meem Jewellers';
  document.querySelector('meta[name="description"]')?.setAttribute('content', item.desc || item.story);
  const related = items.filter((row) => row.id !== item.id).slice(0, 3);
  renderGrid(document.getElementById('dynamicRelatedGrid'), related, maps);
  document.getElementById('dynamicRelated').hidden = !related.length;
}

async function main() {
  const maps = island();
  if (!maps) return;
  const staticIds = new Set((maps.items || []).map((item) => item.id));
  const dynamicId = new URLSearchParams(location.search).get('id');
  const isDynamic = !!document.querySelector('[data-dynamic-piece]');
  if (isDynamic && !/^[a-z0-9][a-z0-9-]{0,79}$/.test(dynamicId || '')) { dynamicState('Piece not found.', 'Choose a piece from the collection to see its details.'); return; }
  const { data, error } = await supabase.from('catalogue').select('id,name,type,occasion,motif,badge,metals,tags,description,story,specs,photo,sort_order,visible,featured,in_stock,updated_at').order('sort_order').order('name');
  if (error || !Array.isArray(data)) {
    if (isDynamic) {
      const fallback = (maps.items || []).find((item) => item.id === dynamicId);
      if (fallback) renderDynamicPiece({ ...fallback, inStock: true }, maps.items, maps);
      else dynamicState('The catalogue is temporarily unavailable.', 'Please try again in a moment, or contact our showroom for availability.');
    }
    return;
  }
  const items = data.filter((row) => row.visible !== false).map((row) => toItem(row, maps, staticIds));
  const byId = new Map(items.map((item) => [item.id, item]));
  maps.items = items;
  document.getElementById('catalogue-data').textContent = JSON.stringify(maps);
  const grid = document.getElementById('productsGrid');
  if (grid) {
    renderGrid(grid, items, maps);
    const empty = document.getElementById('noResults');
    if (empty) { empty.hidden = !!items.length; empty.textContent = 'Our next collection is on its way. Please check back soon or visit the showroom.'; }
  }
  const featured = document.getElementById('featuredGrid');
  if (featured) {
    const featItems = items.filter((item) => item._featured);
    renderGrid(featured, featItems, maps);
    const section = document.getElementById('featured');
    if (section) section.hidden = !featItems.length;
  }
  const spotlight = document.getElementById('spotlight');
  if (spotlight) {
    const item = byId.get(spotlight.dataset.piece);
    if (item) { patchSpotlight(spotlight, item, maps); spotlight.hidden = false; }
    else { spotlight.hidden = true; spotlight.dataset.removed = 'true'; }
  }
  document.querySelectorAll('.piece[data-piece]:not([data-dynamic-piece])').forEach((node) => {
    const item = byId.get(node.dataset.piece);
    if (item) patchPiecePage(node, item, maps);
    else {
      const section = node.closest('section');
      section.hidden = true;
      const message = document.createElement('p'); message.className = 'container admin-empty'; message.textContent = 'This piece is no longer in the catalogue. Please browse the current collection.';
      section.before(message);
      document.title = 'Piece unavailable | Alif Laam Meem Jewellers';
    }
  });
  document.querySelectorAll('.products-grid').forEach((node) => {
    if (node === grid || node === featured || node.id === 'dynamicRelatedGrid') return;
    const relatedItems = [...node.querySelectorAll('.product-card[data-piece]')]
      .map((card) => byId.get(card.dataset.piece)).filter(Boolean);
    renderGrid(node, relatedItems, maps);
  });
  if (isDynamic) renderDynamicPiece(byId.get(dynamicId), items, maps);
  window.dispatchEvent(new Event('alm:catalogue-updated'));
}
main().catch(() => {
  if (document.querySelector('[data-dynamic-piece]')) dynamicState('The catalogue is temporarily unavailable.', 'Please try again in a moment.');
});
