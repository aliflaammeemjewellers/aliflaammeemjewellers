# Alif Laam Meem Jewellers — Premium Website (UI/UX Build)

A high-end, cinematic website **interface & interaction system** for
**ALIF LAAM MEEM JEWELLERS** — inspired by the UI/UX language of bmw-m.com:
editorial layout, sticky transforming header, full-screen menu, smooth scrolling,
scroll-triggered reveals, parallax, carousels, page transitions.

**This build contains ZERO images, photos and videos by design.**
Every visual-media slot is an empty, labeled UI container
(`[ MEDIA AREA ]` with its aspect ratio) so the layout and dimensions can be
reviewed before real media is added.

## Structure

```
├── index.html          Home — cinematic long-scroll interface (11 sections)
├── collections.html    All seven collections, editorial rows
├── about.html          Brand story, quote, atelier & principles
├── journal.html        The Journal — 5 story slots
├── product.html        Piece detail (driven by ?piece=… query)
├── contact.html        Contact form, boutique info, map slot
├── build.py            Assembles root pages from src/ partials + pages
├── src/
│   ├── partials/       head, header (menu/search overlays), footer
│   └── pages/          per-page <main> content
└── assets/
    ├── css/main.css    Full design system (tokens → components → responsive)
    └── js/main.js      Interaction & motion engine (vanilla JS, no libraries)
```

## Media slots (add imagery later)

Every empty container is:

```html
<div class="media"><span class="media__label">[ Media Area ]<b>Hero · Full Viewport · 16 : 9</b></span></div>
```

To add real media later, replace the inner `.media` div with
`<img src="…" alt="…">` inside the same parent — all crop/zoom/hover/parallax
behaviour is already wired to `.media` (and legacy `img`) selectors.

## The interaction system

- Sticky header: transparent over hero → solid + blur on scroll, hides on scroll-down,
  gold scroll-progress hairline
- Full-screen clip-path menu with staggered oversized links (mobile included)
- Search overlay with live filtering
- Premium preloader (skips on repeat visits)
- Inertial smooth scrolling (desktop, `pointer: fine` only; native on touch)
- Scroll reveals: line-masked headlines, clip-path panel reveals, staggered fades
- rAF parallax on full-bleed sections
- Snap carousels with arrows, counters, drag-to-scroll (touch swipe native)
- Page-transition curtain, back-to-top, toasts, newsletter + contact validation
- Fully responsive; `prefers-reduced-motion` respected; no-JS fallback

## Editing

Root pages are generated. Edit `src/partials/*` or `src/pages/*`, then:

```bash
python3 build.py
```

## Placeholders to replace before going live

- Phone / WhatsApp: `+00 00 000 0000` (`wa.me/94770000000`)
- Address: `Address Line 01, City, Country`
- E-mail: `email@placeholder.com`
- Social links: platform home pages
- All body copy marked `placeholder`

## Run locally

```bash
python3 -m http.server 8080 --bind 0.0.0.0
# → http://localhost:8080
