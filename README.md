# Alif Laam Meem Jewellers — Website

A premium, single-page website for a fine-jewellery house, built with the
**light grey × gold** theme. No build step, no frameworks, no dependencies —
just three files.

```
index.html    markup (all content and copy lives here)
styles.css    the design system (tokens, components, responsive rules)
script.js     catalogue data, filters, form handling, interactions
```

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

---

## Design system

The theme follows Apple's design language — flat surfaces, system type, tight
negative tracking, generous white space, and exactly one accent colour.

| Token | Value | Used for |
| --- | --- | --- |
| `--bg` / `--bg-alt` | `#FFFFFF` / `#F5F5F7` | page ground and every card, tile and panel |
| `--fill` / `--separator` / `--hairline` | rgba black / `#D2D2D7` / `#E8E8ED` | segmented control, chips, dividers |
| `--ink` / `--ink-soft` / `--ink-mute` | `#1D1D1F` / `#6E6E73` / `#86868B` | headings, body, secondary text |
| `--gold` / `--gold-deep` | `#B08C4A` / `#8A6A2B` | the single accent — links, eyebrows, prices |
| `--font` | SF system stack | everything |

**Typography** is the macOS/iOS system stack (`-apple-system`, `BlinkMacSystemFont`,
`SF Pro Display/Text`, then Helvetica). No web fonts are loaded at all, so the
site renders instantly and looks native on Apple devices.

**Depth** comes from surface contrast, not shadows: tiles and panels are flat
`#F5F5F7`, separated by hairline dividers, with shadows reserved for the two
floating buttons.

**No ornament.** The earlier gold-gradient theme (Playfair headings, metallic
gradients, engraved arches, rosettes, sunbursts, marquee) has been replaced
throughout. The one piece of brand expression kept is the line-art motif on each
product — it is the stand-in for photography, drawn as inline SVG in the same
flat gold as the accent (two shared gradients, `#goldFill` and `#goldStroke`,
defined once at the bottom of `index.html`).

**Band rhythm.** The page is built as full-bleed bands that alternate, the way
Apple's marketing pages do — the background is the structure, not cards:

| Band | Background | Contents |
| --- | --- | --- |
| Hero | `#000` | eyebrow pill, huge headline, tagline, white pill + gold link, product on a gold glow |
| Collections | `#fff` | eyebrow, heading, segmented control, featured panel, grey tiles |
| The atelier | `#000` | four steps as text with hairline tops — no boxes on dark |
| Appointment | `#fff` | details left, form card right (grey cards on white) |
| Client stories | `#F5F5F7` | white quote cards |
| Visit | `#fff` | grey detail and media cards |
| Footer | `#F5F5F7` | link columns over hairlines |

On dark bands, headings flip to `#F5F5F7`, body copy to `#A1A1A6`, and the
accent switches to the brighter `--gold-on-dark` (`#D2B478`). The hero motif
uses a matching brighter gradient pair (`#goldFillDark`, `#goldStrokeDark`),
because the standard gold is too dark to read on black.

**Notable components**

- *Segmented control* — the collections filter is an Apple-style segmented
  control: a grey track with a white, softly shadowed selected segment.
- *Product tiles* — flat grey tiles with a centred motif, name, description,
  small spec chips, price and a gold "Enquire" link.
- *Featured piece* — a full-width panel above the grid with a white media well,
  a two-column spec table and a dark/grey button pair.
- *Hero* — an eyebrow pill, a huge tight headline, a thin tagline, a white pill
  button and a gold text link, above the product floating on a soft gold glow,
  with a caption and a bobbing scroll cue.

## Editing content

**Business details** — one object at the top of `script.js`:

```js
const SITE = {
  name: 'Alif Laam Meem Jewellers',
  whatsapp: '923000000000',        // digits only, international format
  phoneDisplay: '+92 300 000 0000',
  email: 'care@…',
  addressLine1: '…', addressLine2: '…',
  hoursWeek: '…', hoursSun: '…',
  mapsUrl: '…', instagram: '…', facebook: '…', youtube: '…'
};
```

Anything in the page marked `data-site="key"` is filled from this object, and
`data-site-href="key"` sets the link target. Update it once and it changes in
the appointment panel, the visit card and the footer.

**Catalogue** — the `PRODUCTS` array in `script.js`. Each entry has a `type`
(rings, necklace, earrings, bangles, bridal), `metals` array, `occasion`, a
`motif` (which gold line drawing to show), tags, price and an optional badge.
The filters, chips and grid all build themselves from that data.

Add `featured: true` (plus a `specs` array of `[label, value]` pairs) to one
entry and it is lifted out of the grid into the full-width **Featured piece**
panel above it. Only one piece should carry the flag; the first match wins.
When a filter excludes it, the spotlight disappears and the piece appears as a
normal card, so filtering never breaks the layout.

**Card design** — each piece is a flat grey tile: centred motif, category,
name, description, small spec chips, then a price and a gold "Enquire" link.
Hovering lifts the tile very slightly — no borders, no shadows, no ornament.

**Testimonials** — the `TESTIMONIALS` array in `script.js`.

**Copy and sections** — directly in `index.html`: hero, Collections, The
Atelier, Private Appointment, Client Stories, Visit and the footer.

## Connecting WhatsApp

The appointment form, the product "Enquire" links and the floating button all
open WhatsApp with a pre-written message, using the `SITE.whatsapp` number.
Set that to the showroom's number and it works immediately — no backend or
third-party service required. The form also validates the required fields and
shows inline errors before it hands over.

## Motion

The site animates on load and on scroll. All of it is optional and switches
itself off under `prefers-reduced-motion`.

**On load** a short branded intro plays — the ALM monogram fades up, a gold
hairline draws out beneath it, "Jewellers" fades in — then the curtain lifts and
the hero resolves in sequence: badge, headline, tagline, description, buttons,
then the product and its caption. Three things keep it safe:

- **No flash.** The hero is hidden by CSS before paint, so nothing appears and
  then jumps. The intro element also carries inline layout styles, so it looks
  right even if the stylesheet is still loading.
- **No trap.** If the `load` event never fires (a stalled asset), a 2.8s timer
  releases the page anyway. Scroll is locked while the curtain is up.
- **No JS, no problem.** A `<noscript>` block hides the curtain and reveals the
  hero, and the scroll-reveal animations are forced visible.

Scroll reveals (`.aos-in`) only start after the intro hands over — otherwise the
two animations race and elements resolve at the wrong moment.

**Micro-interactions:** the hero motif sits inside a slow-turning dashed ring
with three twinkling sparks; the wishlist heart pulses a ring when saved; the
WhatsApp button has a steady halo; the appointment success message draws an
animated tick; quote cards stagger in as they scroll into view.

Timings live in CSS (the intro keyframes are in section 5b, near the top of the
file), so you can retune the whole sequence there. The hold before the curtain
lifts — 780ms after `load` — is the `setTimeout(finish, 780)` call in
`initIntro()`.

## Accessibility & performance

- Semantic landmarks, a skip link, `aria-pressed` filter controls, labelled
  form fields, `role="status"` live regions for feedback.
- Keyboard focus styles throughout; the mobile menu button is a real
  `aria-expanded` toggle.
- Full `prefers-reduced-motion` support and a print stylesheet.
- Local Business structured data (JSON-LD) in the head for search engines.
- No images, no libraries and no web fonts — the whole site is three files that
  work completely offline. The only external request is the optional font on
  your own machine, which is already installed.

## Notes before going live

1. Replace the placeholder phone number, address, email and social links.
2. Prices in `PRODUCTS` are indicative only — worth a note to clients given
   how fast bullion moves.
3. Testimonials are illustrative samples — swap in real, permissioned
   client words and set `aggregateRating` in the JSON-LD to match reality.
4. The headline gold rate, claim badges and the illustrated map were removed
   at the client's request; the Visit section now uses a decorative arched
   panel instead. Both are in git history (`df46c32`) if you want them back.
