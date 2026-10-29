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
