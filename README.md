# Lwin Moe Aung — Cinematic Portfolio

A **3D-parallax, scroll-driven** portfolio inspired by editorial film aesthetics (think Nikola Radeski).
Mouse moves the camera. Scroll plays the movie.

---

## Files

```
cinematic/
├── index.html   ← all page content
├── styles.css   ← visual + 3D transforms
├── script.js    ← smooth scroll · cameras · canvas effects
└── README.md    ← this file
```

---

## What makes this site different from the other portfolio?

| Feature | `portfolio/` | `cinematic/` |
|---|---|---|
| Style | Dashboard / data UI | Editorial / cinematic film |
| Scroll | Native | **Virtualised lerp scroll** (smooth) |
| Hero | Neural network canvas | **Curl-noise flow-field canvas** |
| Camera | Hover tilt on cards | **Whole-viewport 3D camera** driven by mouse |
| Projects | Tilt cards in a grid | **Sticky full-bleed scenes** (one per project) |
| Typography | Sans-serif data UI | **Serif display + monospace meta** |
| Cursor | Native | **Custom blend-mode cursor** |

---

## Editing the content

### Your name (Hero)
```html
<h1 class="hero__title">
  <span class="word" data-word>Lwin</span>
  <span class="word" data-word>Moe</span>
  <span class="word word--accent" data-word>Aung</span>
</h1>
```
Each `<span class="word">` animates in independently. The `word--accent` class gives the orange italic.

---

### The manifesto (the four big lines)
```html
<h2 class="manifesto__line manifesto__line--2">
  <em>data</em> into <em>decisions</em>,
</h2>
```
Wrap any phrase you want highlighted in `<em>…</em>` — that adds the orange accent.

---

### Stats marquee
```html
<span class="stats__big">607K+ records</span>
<span class="stats__sep">·</span>
```
Add or remove pairs of `stats__big` + `stats__sep` spans. **Important:** the marquee is duplicated below (`<div class="stats__row" aria-hidden="true">`) — keep both rows in sync for seamless looping.

---

### Adding a project

Each project is a full-viewport scene. Copy this block inside `<section class="projects">`:

```html
<article class="proj" data-proj="5">
  <div class="proj__sticky">
    <div class="proj__bg proj__bg--1" data-depth="20"></div>
    <div class="proj__shapes proj__shapes--1" data-depth="-40"></div>
    <div class="proj__grid"></div>
    <div class="proj__camera" data-camera>
      <div class="proj__inner">
        <div class="proj__meta"><span>Client / Org</span><span>Year</span></div>
        <h3 class="proj__title">Project<br>Title.</h3>
        <p class="proj__sub">Short subtitle</p>
        <p class="proj__desc">Body paragraph.</p>
        <div class="proj__nums">
          <div><b>Number</b><i>label</i></div>
          <div><b>Number</b><i>label</i></div>
          <div><b>Number</b><i>label</i></div>
        </div>
        <div class="proj__chips"><span>Tag</span></div>
      </div>
    </div>
    <div class="proj__index">05</div>
  </div>
</article>
```

**Background colours per project** are defined in `styles.css`:

```css
.proj__bg--5 {
  background:
    radial-gradient(ellipse 70% 60% at 30% 40%, rgba(R,G,B,A) 0%, transparent 65%),
    /* …layer more radial gradients to taste */
    linear-gradient(160deg, #color1 0%, #color2 100%);
}
```

---

### Journey timeline
Each role is a `<div class="rail-card">`:
```html
<div class="rail-card" data-camera>
  <div class="rail-card__year">2025 — Present</div>
  <h3 class="rail-card__role">Role Title</h3>
  <p class="rail-card__co">Company · Location</p>
  <p class="rail-card__body">Description paragraph.</p>
</div>
```
On hover the card expands and the role title slides right in accent colour.

---

### Education / Languages
Find the `<section class="education">` block — every entry is a simple `<div class="edu-row">`. The `<div class="languages">` block at the bottom lists language proficiencies.

---

### Contact
```html
<a href="mailto:bonoerikk@gmail.com" class="contact__mail">
  <span>bonoerikk@gmail.com</span>
</a>
<div class="contact__row">
  <a href="tel:+6590064760">+65 9006 4760</a>
  <a href="https://github.com/Bo-Neau" target="_blank">github.com/Bo-Neau</a>
  <span>Singapore</span>
</div>
```

---

## Theming

All colours live at the top of `styles.css`:

```css
:root {
  --black:   #08080b;   /* page bg */
  --paper:   #f4f0e6;   /* cream paper text */
  --accent:  #ff5722;   /* cinematic orange */
  --data:    #6cd5ff;   /* data accent */
  --gold:    #d4b27a;
  --emerald: #82d0a8;
}
```

To go from cinematic-orange to electric-blue branding, change `--accent: #ff5722;` to `#00d4ff` and the entire site retunes.

---

## Replacing the canvas with real video

The hero canvas is procedural for performance, but you can swap in a real video:

```html
<!-- replace <canvas class="hero__canvas">  with: -->
<video class="hero__canvas" autoplay muted loop playsinline>
  <source src="hero.mp4" type="video/mp4">
</video>
```

The CSS already positions it to fill the hero. Drop your `hero.mp4` (or `.webm`) into the `cinematic/` folder.

The same applies to `manifestoCanvas` and `contactCanvas`.

---

## Performance tuning

If the site feels heavy on lower-end laptops:

1. **Hero canvas density** — open `script.js`, find `length: 280` in the hero canvas section, reduce to `120`.
2. **Galaxy nodes** — change `const COUNT = 80;` to `40`.
3. **Disable cameras on mobile** — already done via `@media (max-width: 900px) { body { cursor: auto; } }` and the cursor's bail-out check.

---

## Hosting (free)

Same as the other portfolio — short version:

| Host | Steps |
|---|---|
| **GitHub Pages** | Push `cinematic/` contents to `<username>.github.io` repo → Settings → Pages → done |
| **Netlify Drop** | Drag the `cinematic/` folder onto [netlify.com/drop](https://app.netlify.com/drop) |
| **Vercel** | Inside the folder run `vercel` after `npm i -g vercel` |

For a custom domain, point a CNAME at the host's URL and configure it in the host dashboard.

---

## Local preview

```bash
cd cinematic
python3 -m http.server 8080
# → open http://localhost:8080
```

Or just double-click `index.html`.

---

## Two portfolios — which to publish?

The two folders are independent. You can:

- **Publish only one** — pick whichever style fits the role you're targeting.
- **Publish both** — the `cinematic/` site is bolder for design-leaning roles; the `portfolio/` site is cleaner for technical recruiters. You could host one at the root and the other at a subpath like `/cinematic`.
- **Use the cinematic site as your "Featured" link on LinkedIn** and the cleaner one as the main URL on your CV.

Both pull from the same CV — so if your role/title changes, you only have to update text, not rebuild.
