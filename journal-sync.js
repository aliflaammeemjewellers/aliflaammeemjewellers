/* The public journal. Only published posts are requested, and RLS enforces the
   same rule on the server. Post content is plain text, never injected as HTML. */
import { createClient } from './vendor/supabase.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';
import { POST_CATEGORIES, safeImage } from './admin-model.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const node = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
};
const dateLabel = (value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const postUrl = (post) => 'journal.html?post=' + encodeURIComponent(post.slug);

function cover(post, className) {
  const src = safeImage(post.image_url);
  if (!src) return null;
  const image = node('img', className);
  image.src = src;
  image.alt = post.title;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.addEventListener('error', () => { image.hidden = true; });
  return image;
}

function postCard(post) {
  const card = node('article', 'journal-card');
  const link = node('a', 'journal-card-link');
  link.href = postUrl(post);
  const image = cover(post, 'journal-card-image');
  if (image) link.append(image);
  else { const placeholder = node('div', 'journal-card-placeholder', 'ALM'); placeholder.setAttribute('aria-hidden', 'true'); link.append(placeholder); }
  link.append(node('span', 'journal-category', POST_CATEGORIES[post.category] || 'House news'));
  link.append(node('h2', '', post.title));
  if (post.excerpt) link.append(node('p', 'journal-card-excerpt', post.excerpt));
  const foot = node('div', 'journal-card-foot');
  const time = node('time', '', dateLabel(post.published_at)); time.dateTime = post.published_at;
  foot.append(time, node('span', 'journal-read', 'Read story ↗'));
  link.append(foot);
  card.append(link);
  return card;
}

function showDetail(post) {
  const detail = document.getElementById('journalDetail');
  const article = node('article', 'journal-article');
  const back = node('a', 'journal-back', '← All stories'); back.href = 'journal.html';
  article.append(back, node('p', 'journal-category', POST_CATEGORIES[post.category] || 'House news'), node('h1', '', post.title));
  const time = node('time', 'journal-date', dateLabel(post.published_at)); time.dateTime = post.published_at; article.append(time);
  const image = cover(post, 'journal-cover'); if (image) article.append(image);
  if (post.excerpt) article.append(node('p', 'journal-standfirst', post.excerpt));
  article.append(node('div', 'journal-body', post.body));
  const cta = node('div', 'journal-cta');
  cta.append(node('h2', '', 'See it in person.'));
  cta.append(node('p', '', 'Our team would be happy to show you the collection and answer your questions.'));
  const link = node('a', 'btn btn-primary', 'Book a showroom visit'); link.href = 'appointment.html'; cta.append(link);
  article.append(cta);
  detail.replaceChildren(article); detail.hidden = false;
  document.getElementById('journalListView').hidden = true;
  document.title = post.title + ' | Alif Laam Meem Jewellers';
  document.querySelector('meta[name="description"]')?.setAttribute('content', post.excerpt || post.body.slice(0, 160));
}

function showList(posts) {
  const grid = document.getElementById('journalGrid');
  grid.replaceChildren(...posts.map(postCard));
  document.getElementById('journalCount').textContent = posts.length + (posts.length === 1 ? ' story' : ' stories') + ' from the house';
  document.getElementById('journalEmpty').hidden = !!posts.length;
  document.getElementById('journalListView').hidden = false;
  document.getElementById('journalDetail').hidden = true;
}

async function loadJournal() {
  const status = document.getElementById('journalStatus');
  status.hidden = false; status.replaceChildren(node('p', '', 'Opening the journal…'));
  document.getElementById('journalListView').hidden = true;
  document.getElementById('journalDetail').hidden = true;
  try {
    const { data, error } = await supabase.from('posts')
      .select('id,title,slug,category,excerpt,body,image_url,published_at')
      .eq('status', 'published').lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false });
    if (error) throw error;
    const posts = data || [];
    status.hidden = true;
    const slug = new URLSearchParams(location.search).get('post');
    if (slug) {
      const post = posts.find((row) => row.slug === slug);
      if (post) showDetail(post);
      else {
        const detail = document.getElementById('journalDetail');
        const box = node('div', 'journal-empty');
        box.append(node('h2', '', 'This story is not available.'), node('p', '', 'It may have been moved back to drafts. There are more stories in the journal.'));
        const back = node('a', 'btn btn-primary', 'Browse the journal'); back.href = 'journal.html'; box.append(back);
        detail.replaceChildren(box); detail.hidden = false;
      }
    } else showList(posts);
  } catch {
    const box = node('div', 'journal-empty');
    box.append(node('h2', '', 'The journal is taking a moment.'), node('p', '', 'We could not load the stories. Please check your connection and try again.'));
    const retry = node('button', 'btn btn-primary', 'Try again'); retry.type = 'button'; retry.addEventListener('click', loadJournal); box.append(retry);
    status.replaceChildren(box);
  }
}
loadJournal();
