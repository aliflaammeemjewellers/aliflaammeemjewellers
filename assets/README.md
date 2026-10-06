# assets/

Add image files in this folder; the build never downloads or creates assets.
For speed, it prefers `hero.webp` and `products/<piece-id>.webp` when those
optimized versions exist, with the original JPG/PNG formats as fallbacks. If you
replace a source photograph, also replace its WebP version or remove the old
WebP so the build can use the new source.

## Your logo

Save your logo as **`logo.svg`** (also works: `logo.png`, `logo.webp`,
`logo.jpg`, `logo.avif`) and rebuild:

```bash
python3 build.py
```

The build finds it and puts it in the header and footer of all 30 pages, uses
it for the browser tab, on the home-page loading curtain, and as the Visit-page
feature image. A standard
`logo.svg` or `logo.png` takes priority; otherwise the optimized `logo.webp` is
used. With no logo file present, the header and footer fall back to the built-in
**ALM** monogram and the tab to the gold diamond favicon.

**Which format.** SVG is best: it stays razor sharp on every screen and retina
display, weighs a few KB, and can be recoloured later. If your designer sent a
raster file, a **transparent PNG at 2x** the height you want on screen is the
next best thing (roughly 140px tall, ~300–400px wide for a lockup).

### Two ways it can be laid out

Open `build.py`, find `LOGO_MODE`, and set whichever describes your file:

| `LOGO_MODE` | Use it when | What appears in the header |
| --- | --- | --- |
| `"lockup"` *(default)* | the file is the **whole logo** — symbol and the words together | just your artwork, in full |
| `"mark"` | the file is the **symbol only** — a monogram, an emblem, a crest | your symbol, with "Alif Laam Meem" and "Jewellers" as live text beside it |

`"lockup"` is the default because most jewellery-house logos include the name,
and printing the name twice looks like a mistake. If your file is a symbol with
no words in it, set `"mark"` — otherwise the header would show a wordless
emblem with nothing identifying the business next to it.

### How it is sized

Your artwork is never stretched or cropped. It is height-locked and the width
follows from its own proportions:

- **lockup** — 34px tall in the header, 28px on phones, capped at 58% of the
  screen width so a long logo can never push the menu button off the edge.
- **mark** — 30px tall, matching the size of the monogram it replaces.

If your logo reads too small or too large, change `--logo-h` on `.logo--lockup`
/ `.logo--mark` in `styles.css`. One value, every page.

### Browser tab icon

The tab icon uses `logo-icon.*` if you provide one (any name from the list
above with `logo-icon` instead of `logo`), otherwise it falls back to your main
logo, otherwise to the gold diamond.

Worth knowing: a **wide** lockup makes a poor tab icon — it gets shrunk into a
square and the name becomes unreadable, leaving a few gold pixels. If that is
what yours does, supply a square `logo-icon.svg` alongside it. And note that
**iOS ignores SVG** for the home-screen icon; the build adds the needed
`apple-touch-icon` tag automatically when your file is a PNG or JPG, so send a
square PNG if home-screen bookmarks matter to you.

### Light and dark backgrounds

The header and footer are both light (`#FFFFFF` and `#F5F5F7`), so a logo with
dark or gold artwork sits on white and needs no special handling. One thing to
watch: a logo whose artwork is **white or very pale** will be invisible on white
— send a version with dark or gold fill, or ask and we will add a dark header
band for it.

## Product photographs

Use the catalogue piece ID for each filename in `assets/products/`, for example
`meher.webp`. WebP files are preferred; JPG/PNG sources are still supported as
fallbacks. Rebuild after replacing photos.

## Hero background

Save your photograph as **`hero.webp`** (preferred for speed; `hero.jpg`,
`hero.jpeg`, `hero.png` and `hero.avif` also work) and rebuild:

```bash
python3 build.py
```

The build finds the file automatically and the home page hero uses it as a
full-bleed background photograph. With no file present, the hero falls back to
the plain black band and nothing breaks.

## What the hero does with your photograph

**On wide screens** the photograph runs full-bleed, edge to edge, centre-cropped
so the whole piece is in frame. The copy sits on a soft dark wash — a radial
pool centred on the text with no hard edge, so it reads as part of the
photograph rather than as a black band. The wash fades to nothing by about 70%
height, which is where the jewellery is: around 39% of the photograph's
brightness comes through there and 50% near the bottom.

**On phones** the photograph is still the background behind the copy — there is
no separate band. A narrow viewport makes the copy block a much larger share of
the hero, so the wash is stronger here (0.85 down to 0.48) than on desktop:
light text on an average photograph simply is not legible without it. The wash
opens up below the copy, where the jewellery shows, so the photograph still
reads as a background and not as a flat panel.

Two more things change whenever a photograph is present:

- **The line drawing is hidden.** It would compete with a real piece of
  jewellery, so the hero becomes type over image.
- **The supporting copy is lightened** from mid grey to `#C7C7CC`, because mid
  greys are not legible over a photograph.

The wash was checked against a worst case — a blown-out gold highlight directly
behind the text — by compositing the CSS over the actual pixels and reading the
contrast of every text style against the result, at both desktop and phone
geometry. Worst results: the headline 14:1, the gold link 6.4:1, and the scroll
cue at its dimmest animation frame 3.2:1. No photograph can make the copy
illegible. If you
want the photograph more visible behind the copy, lower the alpha values on
`.hero--photo::after` in `styles.css` and re-check contrast before you ship.

## What works best

- A wide, landscape photograph — at least 2000px across so it stays sharp on
  large screens.
- A dark upper third works best, since that is where the copy sits. A bright
  subject up there is dimmed by the wash, so it will look flatter than the rest
  of the picture and you lose detail you paid for.
- The subject toward the middle or lower third, where the wash is weakest and
  the photograph shows most clearly.
- Keep the file under about 400 KB so the page still loads quickly. A large
  export straight from a phone or camera is usually several megabytes; ask and
  we will compress and resize it for you.

## Alt text

The photograph is decorative, so it is marked with an empty `alt` and hidden
from assistive technology — a screen reader announces the headline, not a
description of the picture. If this photograph carries meaning you want screen
readers to convey (for example it shows a specific commission), tell us the
sentence you want spoken and we will give it real alt text.
