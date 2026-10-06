# assets/

Drop your own photographs in this folder. Nothing here is generated or committed
by the build — the build only looks for files that already exist.

## Hero background

Save your photograph as **`hero.jpg`** (also works: `hero.jpeg`, `hero.png`,
`hero.webp`, `hero.avif`) and rebuild:

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

**On phones** the photograph moves below the copy and becomes a full-width band.
Covering the whole hero on a narrow screen would put the jewellery directly
behind the headline, because the text block fills most of the viewport. As a
band, the type sits on solid black and the jewellery is shown unobstructed.

Two more things change whenever a photograph is present:

- **The line drawing is hidden.** It would compete with a real piece of
  jewellery, so the hero becomes type over image.
- **The supporting copy is lightened** from mid grey to `#C7C7CC`, because mid
  greys are not legible over a photograph.

The wash was checked against a worst case — a blown-out gold highlight directly
behind the text — by compositing the CSS layers pixel by pixel and reading the
contrast of every text style against the result. The gold link measures 6.7:1
and the headline 11:1, so no photograph can make the hero text illegible. If you
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
