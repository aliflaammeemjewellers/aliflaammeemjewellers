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

- **A dark scrim sits over it**, heaviest at the top where the headline is and
  lighter lower down, so the jewellery in the picture still reads. The
  photograph keeps about 43% of its brightness in the open lower band.
- **The line drawing is hidden** when a photograph is present. It would compete
  with a real piece of jewellery, so the hero becomes type over image.
- **The supporting copy is lightened** from mid grey to `#C7C7CC`, because mid
  greys are not legible over a photograph.
- **Deep bottom padding** leaves a band of unobstructed photograph under the
  text, so the image reads as the hero rather than as a dim texture.

The scrim stops were chosen against a worst case — a blown-out gold highlight
directly behind the text — not against a typical image. Checked that way, the
weakest text pairing is still 6.16:1, so no photograph can make the headline
illegible. If you want the photograph more visible, lower the alpha values on
`.hero--photo` in `styles.css`; if you make the top stop weaker than about
`.72`, re-check contrast first.

## What works best

- A wide, landscape photograph — at least 2000px across so it stays sharp on
  large screens.
- The subject toward the middle or lower third. The headline occupies the upper
  area, so a bright subject up there is hidden behind the scrim anyway.
- Keep the file under about 400 KB so the page still loads quickly. A large
  export straight from a phone or camera is usually several megabytes; ask and
  we will compress and resize it for you.

## Alt text

The image is applied as a CSS background, so it is treated as decoration and
needs no alt text. If the photograph carries meaning you want screen readers to
convey, tell us and we will switch it to a real `<img>` with alt text.
