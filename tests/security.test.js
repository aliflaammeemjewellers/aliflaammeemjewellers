import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const pages = readdirSync(root).filter((name) => name.endsWith('.html'));
const html = (name) => readFileSync(join(root, name), 'utf8');

test('public pages do not load insecure HTTP resources', () => {
  for (const page of pages) {
    const source = html(page);
    const insecure = [...source.matchAll(/(?:href|src|action)=["'](http:\/\/[^"']+)["']/gi)];
    assert.deepEqual(insecure.map((match) => match[1]), [], `${page} has insecure HTTP resources`);
  }
});

test('authentication pages are excluded from search indexing', () => {
  for (const page of ['admin.html', 'signup.html']) {
    assert.match(html(page), /<meta name="robots" content="noindex, nofollow">/i, `${page} must be noindex`);
  }
});

test('generated pages do not contain opaque social tracking parameters or broken sign-in links', () => {
  for (const page of pages) {
    const source = html(page);
    assert.doesNotMatch(source, /[?&](stkn|rdid|share_url)=/i, `${page} has opaque social tracking parameters`);
    assert.doesNotMatch(source, /href=["']login\.html["']/i, `${page} links to a missing login page`);
  }
});

test('pages do not contain hidden embeds, meta redirects, or external script tags', () => {
  for (const page of pages) {
    const source = html(page);
    assert.doesNotMatch(source, /<(iframe|object|embed)\b/i, `${page} has an embedded object`);
    assert.doesNotMatch(source, /http-equiv=["']refresh["']/i, `${page} has a meta redirect`);
    for (const match of source.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
      const src = match[1];
      assert.ok(!/^https?:\/\//i.test(src), `${page} loads an external script: ${src}`);
      assert.ok(existsSync(join(root, src)), `${page} references a missing local script: ${src}`);
    }
  }
});

test('pages carry a CSP and contain no inline executable scripts or inline event handlers', () => {
  for (const page of pages.filter((name) => !/^google[0-9a-f]+\.html$/.test(name))) {
    const source = html(page);
    assert.match(source, /<meta http-equiv="Content-Security-Policy" content="[^"]*script-src 'self';/, `${page} needs the CSP meta tag`);
    for (const match of source.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/gi)) {
      assert.match(match[1], /type="application\/(ld\+)?json"/, `${page} has an inline executable script`);
    }
    assert.doesNotMatch(source, /\son(click|load|error|submit|change|mouseover|focus)\s*=/i, `${page} has an inline event handler`);
  }
});

test('vercel.json sends a strict CSP and anti-framing headers', () => {
  const config = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
  const headers = Object.fromEntries(config.headers[0].headers.map((h) => [h.key, h.value]));
  assert.match(headers['Content-Security-Policy'], /default-src 'self'/);
  assert.match(headers['Content-Security-Policy'], /script-src 'self';/);
  assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
});

test('admin panel renders records with DOM text, never innerHTML', () => {
  for (const file of ['admin.js', 'admin-records.js', 'admin-ui.js']) {
    const source = readFileSync(join(root, file), 'utf8');
    assert.doesNotMatch(source, /\.(innerHTML|outerHTML)\s*=|insertAdjacentHTML|document\.write/, `${file} writes raw HTML`);
  }
});

test('no service-role or secret keys ship to the browser', () => {
  for (const file of readdirSync(root).filter((name) => /\.(js|html)$/.test(name))) {
    const source = readFileSync(join(root, file), 'utf8');
    assert.doesNotMatch(source, /service_role|sb_secret_|eyJhbGciOi[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]*cm9sZSI6InNlcnZpY2Vfcm9sZS/, `${file} contains a secret key`);
  }
});
