# Alif Laam Meem Jewellers — Website

A static, dependency-free marketing site for a fine-jewellery showroom, built in a
strict **black · grey · white** monochrome theme.

```
index.html    markup
styles.css    design system + all layout
script.js     collection data, filtering, form → WhatsApp, interactions
assets/       monochrome photography (hero, showroom, atelier, product plates)
```

No build step, no framework, no trackers. Open `index.html` directly, or serve
the folder:

```bash
python3 -m http.server 8000      # then visit http://localhost:8000
```

## Theme

Everything is drawn from a single monochrome ramp defined in `:root`
(`#050505` → `#ffffff`). Photography is desaturated with `filter: grayscale(1)`
and icons are inline SVG using `currentColor`, so **no colour can enter the
palette** — verified by a test that checks every hex value in the stylesheet for
chroma.

Highlights:

* Black-dominant dark UI, with one deliberate **white "gallery" section** for the
  collections so the black product plates read as framed artwork.
* Playfair Display for headings, Inter for UI text, wide letter-spacing on labels.
* Sharp 2px radii, hairline borders, a subtle film-grain overlay, and a ticker
  strip — no gloss, no gradients beyond light-to-dark.
* Reveal-on-scroll, count-up statistics, marquee trust ticker, hover wipe buttons,
  and a mobile slide-in drawer. All motion collapses under
  `prefers-reduced-motion`.

## Sections

Hero · trust ticker · About (with stats) · Collections (filterable) · Atelier
process · Appointment booking · Testimonials · Footer.

## Editing content

**Business details** (phone, WhatsApp) live in one place — the `BUSINESS` object at
the top of `script.js`. Change it once and every `wa.me` / `tel:` link on the page
updates itself:

```js
const BUSINESS = {
    whatsapp: '91XXXXXXXXXX',          // country code + number, digits only
    phoneDisplay: '+91 XXXXX XXXXX',   // shown to visitors
    phoneDial: '+91XXXXXXXXXX'         // used by tel: links
};
```

**Collections** are the `PRODUCTS` array in `script.js`. Each item carries the
facets used by the filters:

```js
{
    name, material, desc, price, badge, img, alt,
    category, categoryLabel,   // type   — rings, necklace, earrings, bangles, pendants, bespoke
    metal,    metalLabel,      // metal  — gold, diamond, platinum
    occasion                   //        — wedding, everyday, gifting
}
```

Filter buttons (`By Type`, `By Metal`, `By Occasion`) read their options from the
`FACETS` map, so adding a category means adding it to `PRODUCTS` **and**
`FACETS.type.values`.

Testimonials come from the `TESTIMONIALS` array; stats come from the
`data-count` / `data-suffix` attributes in `index.html`.

## Appointment form

The form validates in the browser (required fields are flagged, the date picker
cannot be set in the past) and then composes a formatted WhatsApp message —
name, phone, purpose, date, time and notes — opening `wa.me` in a new tab. No
backend or third-party form service is involved.

Enquire buttons on product cards pre-fill the message with that piece's name, so
the request arrives with context.

## Accessibility

Skip link, single `<h1>` with no skipped heading levels, `aria-expanded` on the
menu toggle, `aria-selected` on filter tabs, live region for the result count,
labelled form fields, decorative art marked `aria-hidden`, visible focus rings,
and full keyboard operation (Escape closes the mobile drawer).

## Verified

Rendered in headless Chromium and asserted with a DOM test suite:

* no horizontal overflow at 320 – 1600px
* no runtime console errors
* every image resolves and has descriptive alt text
* filters, chips, menu, form validation and pre-fill behave correctly
* palette contains zero chromatic colours
