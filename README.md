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

The whole look is driven by CSS custom properties at the top of `styles.css`.

| Token | Value | Used for |
| --- | --- | --- |
| `--grey-50 … --grey-300` | light greys | page grounds, cards, hairlines |
| `--ink` / `--ink-soft` | near-black, warm grey | headings, body copy |
| `--gold` `--gold-deep` `--gold-light` | `#C6A15B` `#9A7734` `#E4CE9B` | accents, icons, dividers |
| `--gold-grad` | multi-stop metallic | buttons, badges, monogram, shimmer text |
| `--font-display` | Playfair Display | headings, prices, numerals |
| `--font-body` | Inter | interface and body copy |

**All artwork is code.** There are no image files: the hero medallion, the
engraved showcase panel, the jewellery motif on every product card (rings,
necklaces, jhumkas, bangles, bridal sets) and the stylised map are drawn with
CSS gradients, borders and inline SVG line-art using two shared gradients
(`#goldFill`, `#goldStroke`) defined once at the bottom of `index.html`.

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
  rate22k: 'PKR 24,850',           // headline gold rate, update daily
  rateDate: '06 October 2026',
  mapsUrl: '…', instagram: '…', facebook: '…', youtube: '…'
};
```

Anything in the page marked `data-site="key"` is filled from this object, and
`data-site-href="key"` sets the link target. Update it once and it changes in
the top bar, the appointment panel, the visit card and the footer.

**Catalogue** — the `PRODUCTS` array in `script.js`. Each entry has a `type`
(rings, necklace, earrings, bangles, bridal), `metals` array, `occasion`, a
`motif` (which gold line drawing to show), tags, price and an optional badge.
The filters, chips and grid all build themselves from that data.

**Testimonials** — the `TESTIMONIALS` array in `script.js`.

**Copy and sections** — directly in `index.html`: hero, The House, Collections,
The Atelier, Private Appointment, Client Stories, Visit and the footer.

## Connecting WhatsApp

The appointment form, the product "Enquire" links and the floating button all
open WhatsApp with a pre-written message, using the `SITE.whatsapp` number.
Set that to the showroom's number and it works immediately — no backend or
third-party service required. The form also validates the required fields and
shows inline errors before it hands over.

## Accessibility & performance

- Semantic landmarks, a skip link, `aria-pressed` filter controls, labelled
  form fields, `role="status"` live regions for feedback.
- Keyboard focus styles throughout; the mobile menu button is a real
  `aria-expanded` toggle.
- Full `prefers-reduced-motion` support and a print stylesheet.
- Local Business structured data (JSON-LD) in the head for search engines.
- No images, no libraries, no web fonts beyond two Google families — so the
  page is very light and works offline apart from the fonts.

## Notes before going live

1. Replace the placeholder phone number, address, email and social links.
2. Update `rate22k` and `rateDate` (the top bar shows a live-looking rate —
   keep it honest, or delete `<span class="rate …">` from the top bar).
3. Prices in `PRODUCTS` are indicative only; the collections note says so
   explicitly, which is worth keeping given bullion movement.
4. Testimonials are illustrative samples — swap in real, permissioned
   client words and set `aggregateRating` in the JSON-LD to match reality.
