# Alif Laam Meem Jewellers — Premium Website

A world-class luxury jewellery website for **ALIF LAAM MEEM JEWELLERS** — fine 22K gold
and diamond jewellery. Built as a fast, dependency-free static site with a custom
motion & interaction engine (no frameworks, no libraries).

## Structure

```
├── index.html          Home — cinematic long-scroll experience (11 sections)
├── collections.html    All seven collections, editorial rows
├── about.html          Brand story, atelier & craftsmanship
├── journal.html        The Journal — jewellery stories & style guides
├── product.html        Signature piece detail (driven by ?piece=… query)
├── contact.html        Contact form, boutique info & map
├── build.py            Assembles root pages from src/ partials + pages
├── src/
│   ├── partials/       head, header (menu/search overlays), footer
│   └── pages/          per-page <main> content
└── assets/
    ├── css/main.css    Full design system (tokens → components → responsive)
    ├── js/main.js      Motion & interaction engine (vanilla JS)
    └── img/            Original AI-generated jewellery imagery
```

## Editing content

Root-level HTML files are generated. To change shared chrome (header, menu,
footer), edit `src/partials/*` and re-run:

```bash
python3 build.py
```

## Placeholders to replace before going live

- Phone / WhatsApp number: `+94 77 000 0000` (`wa.me/94770000000`) — search & replace
- Boutique address: `No. 45, Galle Road, Colombo 03, Sri Lanka`
- E-mail: `hello@aliflaammeemjewellers.com`
- Social links: platform home pages (Instagram / Facebook / YouTube)
- Google Maps embeds & "Get directions" links

## Run locally

```bash
python3 -m http.server 8080 --bind 0.0.0.0
# → http://localhost:8080
```

## Features

- Sticky header: transparent over hero → solid + blur on scroll, hides on scroll-down
- Full-screen staggered menu overlay with clip-path reveal
- Search overlay with live filtering
- Premium preloader (skips on repeat visits)
- Inertial smooth scrolling (desktop, pointer:fine only)
- Scroll-triggered reveals: line-masked headlines, clip-path image reveals, staggered fades
- rAF parallax on full-bleed media
- Snap carousels with arrows, counters and drag-to-scroll
- Page-transition curtain, back-to-top, toasts, newsletter + contact validation
- Fully responsive incl. premium mobile menu & swipeable carousels
- `prefers-reduced-motion` respected throughout
