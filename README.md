# Alif Laam Meem Jewellers — Website

A static, dependency-free marketing site for a fine bridal-jewellery showroom,
styled in **warm ivory with light gold accents** and deep ink for contrast.

```
index.html    markup
styles.css    design system + all layout
script.js     collection data, filtering, form → WhatsApp, interactions
assets/       photos you supply (see "Adding your images")
```

No build step, no framework, no trackers. Open `index.html` directly, or serve
the folder:

```bash
python3 -m http.server 8000      # then visit http://localhost:8000
```

## Theme

Light and bridal: an ivory base (`#FBF7F0`) lit by soft pools of light gold, with
light gold (`#C6A664` / `#DCC48F`) used for every accent — section rules, icons,
filter chips, form focus rings, star marks — and deep ink (`#1B1712`) reserved for
buttons and the footer so the page keeps its contrast.

The backdrop is built entirely in CSS: three blurred gold light pools, a faint
diamond motif tiled across the top of the page, and a light grain layer. Nothing
is baked into an image, so it stays crisp on every screen.

Type is Playfair Display for headings, Inter for UI text, with wide letter-spacing
on the small-caps labels.

## Sections

Hero · Collections · Atelier process · Appointment booking · Testimonials ·
Footer.

The hero trust badges, floating category cards, scrolling ticker, "Our Story"
section and the statistics strip were removed in this revision — `index.html` and
`styles.css` no longer carry them, so there is no dead markup to clean up.

## Adding your images

The site ships with **no photography**. Every image position renders as a labelled
gold placeholder frame that names the exact file to supply, so nothing looks
broken while you gather your own photos.

### 1. Hero image

Save your bridal set photo as `assets/hero-bridal.jpg`. The hero frame picks it up
automatically once you swap the placeholder for an `<img>`:

```html
<figure class="hero-figure">
    <img src="assets/hero-bridal.jpg" alt="Bridal gold and diamond necklace set">
</figure>
```

A portrait photo works best here (the frame is roughly 4:4.7).

### 2. Collection pieces

Each piece gets a photo plus one entry in `PRODUCTS` (top of `script.js`). The card,
price row, filter chips and enquiry button all build themselves.

```js
const PRODUCTS = [
    {
        name: 'Kundan Bridal Set',
        material: '22K Gold · Uncut Diamonds',
        category: 'bridal', categoryLabel: 'Bridal Sets',
        metal: 'gold', metalLabel: 'Gold',
        occasion: 'wedding',
        desc: 'Layered necklace with matching earrings and maang tikka.',
        price: '₹4,80,000 – ₹8,50,000',
        badge: 'Bridal',                // optional ribbon, '' for none
        img: 'assets/bridal-set.jpg',   // leave '' to keep the placeholder frame
        imgHint: 'assets/bridal-set.jpg',
        alt: 'Kundan bridal necklace set with matching earrings'
    }
];
```

While `PRODUCTS` is empty the collections section shows a setup panel instead of an
empty grid, and the filter tabs and piece counter hide themselves. Add your first
piece and the full showcase appears.

Square photos (1:1) suit the grid best.

### 3. Filter options

The filter buttons read their choices from the `FACETS` map in `script.js`. Adding a
category means adding it to `PRODUCTS` **and** to `FACETS.type.values`:

```js
type: {
    values: [
        { value: 'all', label: 'All Types' },
        { value: 'bridal', label: 'Bridal Sets' },
        // …
    ]
}
```

### 4. Business details

Phone and WhatsApp live in one place — the `BUSINESS` object at the top of
`script.js`. Change it once and every `wa.me` / `tel:` link updates itself:

```js
const BUSINESS = {
    whatsapp: '91XXXXXXXXXX',          // country code + number, digits only
    whatsappMessage: '…',              // optional default text
    phoneDisplay: '+91 XXXXX XXXXX',   // shown to visitors
    phoneDial: '+91XXXXXXXXXX'         // used by tel: links
};
```

Testimonials come from the `TESTIMONIALS` array in the same file.

## Appointment form

The form validates in the browser (required fields flagged, date picker cannot be
set in the past) and then composes a formatted WhatsApp message — name, phone,
purpose, date, time and notes — opening `wa.me` in a new tab. No backend or
third-party form service is involved.

Enquire buttons on product cards pre-fill the message with that piece's name, so the
request arrives with context.

## Accessibility

Skip link, single `<h1>` with no skipped heading levels, `aria-expanded` on the menu
toggle, `aria-selected` on filter tabs, a live region for the piece count, labelled
form fields, decorative art marked `aria-hidden`, visible focus rings in gold, and
full keyboard operation (Escape closes the mobile drawer).

## Verified

Rendered in headless Chromium and asserted with a DOM test suite (43 checks):

* no horizontal overflow at 320 – 1600px
* no runtime console errors
* all 17 icons resolve to inline SVG; no emoji or font-dependent glyphs anywhere
* image placeholders are labelled and carry no broken `src`
* filters, menu, form validation, WhatsApp composition and enquiry pre-fill behave
* palette is light with gold accents (colour values asserted)
