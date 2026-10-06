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

**On wide screens** the photograph fills the hero behind the text, with a dark
scrim over it — heaviest at the top where the headline is, lighter lower down,
so the jewellery in the picture still reads. About 53% of the photograph's
brightness comes through behind the jewellery.

**On phones** the photograph moves below the copy and becomes a full-width band.
Covering the whole hero on a narrow screen would put the jewellery directly
behind the headline, because the text block fills most of the viewport. As a
band, the type sits on solid black and the jewellery is shown unobstructed.
- **The line drawing is hidden** when a photograph is present. It would compete
  with a real piece of jewellery, so the hero becomes type over image.
- **The supporting copy is lightened** from mid grey to `#C7C7CC`, because mid
  greys are not legible over a photograph.
- **Deep bottom padding** leaves a band of unobstructed photograph under the
  text, so the image reads as the hero rather than as a dim texture.

The scrim stops were chosen against a worst case — a blown-out gold highlight
directly behind the text — not against a typical image, and the current
photograph was composed for: the build orients it to the top, where the velvet
is darkest. Checked that way, the weakest text pairing is 5.6:1, so no
photograph can make the headline illegible. If you want the photograph more
visible, lower the alpha values on `.hero--photo::after` in `styles.css`; if you
make the 58% stop weaker than about `.70`, re-check contrast first.

## What works best

- A wide, landscape photograph — at least 2000px across so it stays sharp on
  large screens.
- The subject toward the middle or lower third. The headline occupies the upper
  area, so a bright subject up there is hidden behind the scrim anyway.
- A dark upper third works best, since that is where the headline sits.
- Keep the file under about 400 KB so the page still loads quickly. A large
  export straight from a phone or camera is usually several megabytes; ask and
  we will compress and resize it for you.

## Alt text

The photograph is decorative, so it is marked with an empty `alt` and hidden
from assistive technology — a screen reader announces the headline, not a
description of the picture. If this photograph carries meaning you want screen
readers to convey (for example it shows a specific commission), tell us the
sentence you want spoken and we will give it real alt text.
