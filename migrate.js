/* One-off data move: old project -> current project.
   Runs entirely in the owner's browser under their own admin sessions, so no
   service key ever exists in the page. Idempotent: rows are upserted by id. */
import { createClient } from './vendor/supabase.js';
import { SUPABASE_URL as NEW_URL, SUPABASE_ANON_KEY as NEW_KEY } from './supabase-config.js';
import { $ } from './admin-ui.js';
import { TABLES, PROFILE_COLUMNS, chunk, prepare, matchProfiles, profilePatch,
  externalImages, summarise } from './migrate-model.js';

const OLD_URL = 'https://eafqpwwpwzjdrkrtoqlz.supabase.co';
const OLD_KEY = 'sb_publishable_zoi5AWHlAjPn6bx8QOfrPQ_v8vXIHzT';

if (window.top !== window.self) {
  document.body.replaceChildren();
  throw new Error('The data transfer page cannot be opened inside a frame.');
}

const clients = {
  old: createClient(OLD_URL, OLD_KEY),
  new: createClient(NEW_URL, NEW_KEY)
};
const state = { oldAdmin: false, newAdmin: false, newUser: null, counts: {}, busy: false };

const chunkSize = 100;

function log(message, tone = '') {
  const box = $('#log');
  box.classList.remove('mig-hidden');
  const line = document.createElement('div');
  if (tone) line.className = tone;
  line.textContent = message;
  box.append(line);
  box.scrollTop = box.scrollHeight;
}

function setStatus(which, tone, text) {
  const dot = $(`#${which}Dot`);
  dot.className = 'mig-dot' + (tone ? ' ' + tone : '');
  $(`#${which}Status`).textContent = text;
}

async function readAll(client, table, options = {}) {
  if (options.rpc) {
    const { data, error } = await client.rpc(options.rpc);
    if (!error) return data || [];
    log(`  ${table}: ${options.rpc}() unavailable (${error.message}); reading public columns instead.`, 'warn');
  }
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from(table).select('*').range(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) return out;
  }
}

/* Insert first, fall back to an update when the id already exists. This avoids
   depending on upsert privileges on the column-level grants, and one rejected
   row can never take a whole batch down with it. */
async function writeRow(client, table, row, conflict) {
  const { error } = await client.from(table).insert(row);
  if (!error) return null;
  const duplicate = error.code === '23505' || /duplicate key/i.test(error.message || '');
  if (!duplicate) return error;
  const key = row[conflict];
  if (key == null) return error;
  const patch = { ...row };
  delete patch[conflict];
  const { error: updateError } = await client.from(table).update(patch).eq(conflict, key);
  return updateError;
}

async function writeAll(client, table, rows, conflict) {
  const failed = [];
  let written = 0;
  for (const part of chunk(rows, chunkSize)) {
    const { error } = await client.from(table).upsert(part, { onConflict: conflict });
    if (!error) { written += part.length; continue; }
    // One bad row should not lose the whole batch: retry singly, keep the rest.
    for (const row of part) {
      const single = await writeRow(client, table, row, conflict);
      if (single) failed.push({ id: row.id, message: single.message });
      else written++;
    }
  }
  return { written, failed };
}

async function verifyAdmin(which) {
  const client = clients[which];
  const { data, error } = await client.rpc('is_admin');
  if (error) return { ok: false, message: error.message };
  return { ok: data === true, message: data === true ? 'Admin access confirmed.' : '' };
}

async function afterSignIn(which) {
  const client = clients[which];
  const { data } = await client.auth.getUser();
  if (!data || !data.user) {
    setStatus(which, 'bad', 'Not signed in.');
    if (which === 'old') state.oldAdmin = false; else state.newAdmin = false;
    updateButtons();
    return;
  }
  if (which === 'new') state.newUser = data.user;
  const check = await verifyAdmin(which);
  if (check.ok) {
    setStatus(which, 'ok', `Signed in as ${data.user.email} — admin confirmed.`);
  } else {
    setStatus(which, 'bad', `Signed in as ${data.user.email}, but this account is not on that project's admin list${check.message ? ' (' + check.message + ')' : ''}.`);
  }
  if (which === 'old') state.oldAdmin = check.ok; else state.newAdmin = check.ok;
  updateButtons();
}

function updateButtons() {
  const ready = state.oldAdmin && state.newAdmin && !state.busy;
  $('#previewBtn').disabled = !ready;
  $('#runBtn').disabled = !ready;
}

async function signInWithPassword(which, email, password) {
  const { error } = await clients[which].auth.signInWithPassword({ email, password });
  if (error) {
    setStatus(which, 'bad', error.message);
    return;
  }
  await afterSignIn(which);
}

async function signInWithGoogle(which) {
  const { error } = await clients[which].auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
  if (error) setStatus(which, 'bad', error.message);
}

function selectedTables() {
  return TABLES.filter((entry) => {
    const box = document.querySelector(`input[data-table="${entry.key}"]`);
    return box && box.checked;
  });
}

/* ---------- rendering ---------- */

function renderChecks() {
  const box = $('#tableChecks');
  for (const entry of TABLES) {
    const label = document.createElement('label');
    label.className = 'mig-check';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = true;
    input.dataset.table = entry.key;
    const text = document.createElement('span');
    text.textContent = entry.label + ' ';
    const small = document.createElement('small');
    small.textContent = entry.note;
    const count = document.createElement('em');
    count.className = 'mig-count';
    count.dataset.count = entry.key;
    text.append(count, small);
    label.append(input, text);
    box.append(label);
  }
}

function renderResults(results) {
  const body = $('#resultBody');
  body.replaceChildren();
  let total = 0, copied = 0, failed = 0;
  for (const entry of results) {
    const tr = document.createElement('tr');
    const cells = [entry.label, String(entry.total), String(entry.written), String(entry.failed.length)];
    cells.forEach((value, index) => {
      const td = document.createElement('td');
      td.textContent = value;
      if (index > 0) td.className = 'mig-count';
      tr.append(td);
    });
    body.append(tr);
    total += entry.total; copied += entry.written; failed += entry.failed.length;
  }
  $('#resultSummary').textContent = failed
    ? `${copied} of ${total} rows copied. ${failed} could not be written — see the log.`
    : `${copied} of ${total} rows copied. Nothing left behind.`;
  $('#resultCard').classList.remove('mig-hidden');
  return { total, copied, failed };
}

function renderAccounts(unmatched) {
  const block = $('#accountBlock');
  const list = $('#accountList');
  list.replaceChildren();
  if (!unmatched.length) { block.classList.add('mig-hidden'); return; }
  for (const entry of unmatched.slice(0, 200)) {
    const li = document.createElement('li');
    li.textContent = entry.full_name ? `${entry.full_name} — ${entry.email}` : entry.email;
    list.append(li);
  }
  block.classList.remove('mig-hidden');
}

function renderImages(urls) {
  const block = $('#imageBlock');
  const list = $('#imageList');
  list.replaceChildren();
  if (!urls.length) { block.classList.add('mig-hidden'); return; }
  for (const url of urls.slice(0, 200)) {
    const li = document.createElement('li');
    const code = document.createElement('code');
    code.textContent = url;
    li.append(code);
    list.append(li);
  }
  block.classList.remove('mig-hidden');
}

/* ---------- actions ---------- */

async function preview() {
  if (!state.oldAdmin) return;
  state.busy = true; updateButtons();
  log('Checking the old project…');
  for (const entry of selectedTables()) {
    try {
      const rows = await readAll(clients.old, entry.key, { rpc: entry.rpc });
      state.counts[entry.key] = rows.length;
      const label = document.querySelector(`em[data-count="${entry.key}"]`);
      if (label) label.textContent = `(${rows.length} rows) `;
      log(`  ${entry.label}: ${rows.length} row${rows.length === 1 ? '' : 's'} found.`, 'ok');
    } catch (error) {
      log(`  ${entry.label}: ${error.message}`, 'err');
    }
  }
  state.busy = false; updateButtons();
}

async function run() {
  if (!state.oldAdmin || !state.newAdmin || state.busy) return;
  state.busy = true; updateButtons();
  $('#resultCard').classList.add('mig-hidden');
  log('Starting transfer. Nothing in either project is deleted.');
  const results = [];
  const allRows = {};

  for (const entry of selectedTables()) {
    try {
      const raw = await readAll(clients.old, entry.key, { rpc: entry.rpc });
      allRows[entry.key] = raw;
      const rows = prepare(entry.columns, raw);
      log(`Copying ${entry.label.toLowerCase()} (${rows.length})…`);
      if (!rows.length) { results.push({ ...entry, total: 0, written: 0, failed: [] }); continue; }
      const { written, failed } = await writeAll(clients.new, entry.key, rows, entry.conflict);
      results.push({ ...entry, total: raw.length, written, failed });
      log(`  ${written} copied${failed.length ? `, ${failed.length} failed` : ''}.`, failed.length ? 'warn' : 'ok');
      for (const item of failed.slice(0, 5)) log(`  id ${item.id}: ${item.message}`, 'err');
    } catch (error) {
      results.push({ ...entry, total: 0, written: 0, failed: [{ id: '-', message: error.message }] });
      log(`  ${entry.label}: ${error.message}`, 'err');
    }
  }

  // Catalogue photos that still point at the old project's storage.
  const photoRows = [...(allRows.posts || []), ...(allRows.pieces || [])];
  renderImages(externalImages(OLD_URL, photoRows));

  // Profiles: link old names/phones to accounts that exist again in the new project.
  let unmatched = [];
  try {
    const oldProfiles = await readAll(clients.old, 'profiles');
    const newProfiles = await readAll(clients.new, 'profiles');
    const matches = matchProfiles(oldProfiles, newProfiles);
    unmatched = matches.unmatched;
    let patched = 0;
    for (const pair of matches.matched) {
      const patch = profilePatch(pair.from, pair.to);
      if (!Object.keys(patch).length) continue;
      const { error } = await clients.new.from('profiles').update(patch).eq('id', pair.to.id);
      if (error) log(`  profile ${pair.email}: ${error.message}`, 'err');
      else patched++;
    }
    log(`Profiles: ${patched} updated from old records, ${unmatched.length} account(s) still to recreate.`,
      unmatched.length ? 'warn' : 'ok');
  } catch (error) {
    log(`Profiles: ${error.message}`, 'err');
  }

  renderAccounts(unmatched);
  const totals = renderResults(results);
  log(totals.failed ? 'Finished with some rows rejected — see above.' : 'Finished. Everything selected was copied.',
    totals.failed ? 'warn' : 'ok');
  state.busy = false; updateButtons();
}

/* ---------- wiring ---------- */

renderChecks();

$('#oldForm').addEventListener('submit', (event) => {
  event.preventDefault();
  signInWithPassword('old', $('#oldEmail').value.trim(), $('#oldPassword').value);
});
$('#newForm').addEventListener('submit', (event) => {
  event.preventDefault();
  signInWithPassword('new', $('#newEmail').value.trim(), $('#newPassword').value);
});
document.querySelectorAll('[data-google]').forEach((button) => {
  button.addEventListener('click', () => signInWithGoogle(button.dataset.google));
});
$('#previewBtn').addEventListener('click', () => preview().catch((error) => {
  log(error.message, 'err'); state.busy = false; updateButtons();
}));
$('#runBtn').addEventListener('click', () => run().catch((error) => {
  log(error.message, 'err'); state.busy = false; updateButtons();
}));

// Restore any session that survived a Google redirect.
(async () => {
  for (const which of ['old', 'new']) {
    const { data } = await clients[which].auth.getSession();
    if (data && data.session) await afterSignIn(which);
  }
  updateButtons();
})();

export { selectedTables, PROFILE_COLUMNS, summarise };
