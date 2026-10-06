# assets/

Drop your own photographs in this folder. Nothing here is generated or
committed by the build — the build only looks for files that already exist.

## Hero background

Save your photograph as **`hero.jpg`** (also works: `hero.jpeg`, `hero.png`,
`hero.webp`, `hero.avif`) and rebuild:

```bash
python3 build.py
```

The build finds the file automatically and the home page hero uses it as a
full-bleed background photograph, with a dark scrim over it so the headline
stays legible. If no file is present, the hero falls back to the plain black
band and nothing breaks.

**What works best**

- A wide, landscape photograph — at least 2000px across so it stays sharp on
  large screens.
- The subject roughly in the middle or lower third, since the headline sits in
  the upper area and the jewellery motif sits below it.
- Anything dark or mid-toned. Very bright images fight the scrim and the gold
  headline. The scrim is `rgba(0,0,0,.58)` at the top deepening to `.88` at the
  bottom — adjust `.hero--photo` in `styles.css` if your image needs more or
  less.
- Keep the file under about 400 KB (compress it, or export as WebP) so the page
  still loads quickly.

The image is applied as a CSS background, so it is treated as decoration — it
needs no alt text. If the photograph carries meaning you want screen readers to
convey, tell me and I will switch it to a real `<img>` with alt text.
