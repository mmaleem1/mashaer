# Mashaer — running state

Branch `mashaer-rebrand`, last commit `9a753c8`. Everything below is **uncommitted**
working-tree change — 31 files. Suite: **2745 tests, 2744 pass, 0 fail, 1 skip** (the
skip is a Windows-only DACL test, skipped on macOS — pre-existing). Production build
clean. `npm run check:makkah-presets` and `npm run check:light-theme` both report
their generated files current.

## Done this session (batch, not yet committed)

- [x] **Opening shot is the Haram, not Austin.** `flyToHaram` in `src/camera.js`
      (+ a `makkah` entry in `CAMERA_PRESETS`); wired at `src/main.js`. The camera
      stands 600 m NORTH of the Kaaba looking south, and its altitude is DERIVED
      from that offset (`ground + standoff·tan30`), not typed beside it.
      `flyToAustin` is kept and still exported — RULE 17 — with a dated note.
- [x] **README no longer speaks in the upstream author's voice.** The `What's Next`
      section is now Mashaer's own, followed by a clearly attributed blockquote of
      Bilawal Sidhu's original (its "hosted God's Eye View at Halfpixel" roadmap is
      marked as theirs). `Maintainers:` → `Upstream:` with "They do not maintain
      this fork". The survey image's alt text said "open-sourcing Mashaer"; it was
      a survey about open-sourcing God's Eye View.
- [x] **Preset id `mashair` → `holy-sites`.** It was the app's own name
      transliterated a second way. 3 voice enums, the alias table, 2 tests and the
      generator source all moved together.
- [x] **Two new generated presets** (`npm run build:makkah-presets`, 8 presets /
      40 POIs): `makkah-haram` "Around the Haram" (Jabal Omar, Masjid al-Jinn,
      Jannat al-Mu'alla, Al Misfalah, Al Hindawiyah) and `makkah-north`
      (Al Hujun, Al Utaybiyah, Rea Zakhir, Ar Rashidiyah, Ash Shara'i).
      No existing POI's framing changed — the diff is additions plus two
      widened `viewBounds`.
- [x] **Makkah presets now come FIRST in `CITY_POIS`.** They were appended last,
      so the location row opened on Austin and every Makkah pill — including the
      one holding Mina, Muzdalifah and Arafat — was off the right-hand end.
- [x] **PWA shipped and verified** — manifest, 4 generated icons (192/512/maskable/
      apple-touch), apple-* meta, `public/sw.js`, prod-only registration in
      `src/pwa.js`. Verified in the browser: worker `activated`, and with the
      server STOPPED the shell still loads from cache while `/api/*` correctly
      fails rather than serving stale.
- [x] **Narrow-width panels size to content.** Below 720px `#left-panel-stack` and
      `#right-context-rail` each claimed a fixed half of the screen regardless of
      content; two collapsed headers reserved 372px. Now content-sized under the
      same ceilings: the visible globe band on a 375x812 phone went 65px → 243px.
- [x] **Phone top-row collision fix** — title bar, top-centre actions and the style
      indicator all sat at `top: 32px` and overlapped below ~620px.
- [x] **Intel HUD re-themed** at the owner's request: the simulated classification
      banner, the satellite mission ids, the fabricated orbit/pass numbers and the
      red blinking "REC" light are gone. Every REAL readout (MGRS, lat/lon, ALT,
      SUN, GSD, ONA, UTC clock) is untouched.
- [x] **Narrow-width "pop ups" pass** (owner-reported): the collapsed dock wings go
      ICON-ONLY below 720px — their labels had `width: max-content` +
      `overflow: visible` and painted outside 44px boxes ("LOCATION" is 84px wide,
      "VISUAL PRESETS" 130px), which is what read as overlapping controls; the
      Context panel now defaults COLLAPSED for a first-time visitor on a narrow
      viewport (it opened to 255px of placeholder); and `.hud-summary-wrap`'s
      hardcoded 420px, inset 39px, ran 84px off a 375px screen.
      Net on a 700x900 window: visible globe 30% → 46%.
- [x] **Phone layout rework** (owner-driven, several rounds): all five collapsed
      panels are now ONE symmetrical 3-column grid at the top (every chip exactly
      109x50, both rows column-aligned) instead of five scattered full-width bars
      in two places; the context rail moved from bottom-anchored across the lower
      half to top-anchored at 128px, capped at 180px. Command dock widened from
      276px to 348px so `LOCATION` and `VISUAL PRESETS` fit and keep their names
      (an icon-only version was tried and rejected by the owner). Intel HUD keeps
      only its top-left summary corner at phone widths. Visible globe 30% -> ~66%.
- [x] **Credit guard rewritten** for the rail's top anchor and mutation-proved
      (cap 180px -> 400px fails at 18 viewports). Desktop verified unchanged at
      1440px: stack back to a column, rail to 26vh, dock to its original width.
- [x] Both voice drift guards re-pinned (3rd time) after verifying `git diff
      vite.config.js` was exactly the three enum lines.

## Session 3 — owner-driven, 2026-09-11

- [x] **Six controls, 3 + 3.** CCTV and CONTEXT retired from the UI (RULE 17:
      one dated CSS block at the end of style.css is the WHOLE retirement, and
      deleting it brings both back — markup, JS and tests are all untouched).
      RADIO went with CONTEXT because `#radio-panel` is NESTED INSIDE
      `#global-context-panel` in index.html; that is a real capability leaving
      the UI and it is called out here on purpose. `#cctv-sync-chip` went too —
      it lives outside the panel and was still announcing "LOADING FRAMES 0/0".
      DISPLAY now re-parents into `#left-panel-stack` below 720px
      (`_syncDisplayPanelHome`, src/ui.js), so the three chips form ONE row that
      mirrors the three-wing dock: 109x50 each at x=16/133/250 on a 375px phone.
- [x] **NOT radio buttons.** The owner asked for radio buttons; they are
      disclosure toggles and `aria-expanded` is kept. Marking them `role="radio"`
      would tell a screen reader that exactly one is selected, which is false —
      src/ui.js:3983 says outright that both dock trays can be pinned open at
      once. The uniform LOOK was the actual ask and that is what shipped.
- [x] **Cesium/Google credit moved INTO the bottom-left corner** (owner). It
      floated at `calc(2vh + 5rem)`, ~96px up the lower-left globe, because the
      dock owned the bottom. The dock now yields: `bottom: 3rem` at both the
      720px and 900px anchors (BOTH stated — §1), credit at `0.5rem`/`0.75rem`,
      a measured 12px gap. Net bottom chrome is SMALLER than before (110px vs
      124px) because the credit no longer needs its own band above the dock.
- [x] **Credit guard rewritten and mutation-proved.** The old test proved a
      2vh-cancellation hazard that no longer exists (the credit is under the
      dock now, and both anchors are constants). Replaced with a full
      viewport-grid clearance check plus a new assertion that neither anchor
      depends on viewport height. Dropping the dock to 1rem fails it at all
      121 width x height combinations; 3rem passes.
- [x] **"NORMAL" labels removed** (owner). `#style-indicator` starts `hidden`
      and un-hides only when a real filter is chosen; the intel HUD's big
      `#hud-mode` does the same; and the HUD summary drops its style prefix
      when unfiltered. Every readout still names the filter the moment one is on.
- [x] **Preset names no longer use compass directions** (owner). Renamed in
      `scripts/makkah-places.json` and regenerated — ids unchanged, so no voice
      enum, alias or drift-guard churn:
        Makkah Central -> **Ajyad & Aziziyah**
        Makkah South   -> **Al Awali & Al Naseem**
        Makkah West    -> **Al Zahir & Khalidiyah**
        Makkah North   -> **Al Hujun & Shara'i**
      "Around the Haram" already had no compass direction and is unchanged.
- [x] **Lat/long verified against OSM** (owner). Findings, all evidence-backed
      and recorded in the `_comment` block of `scripts/makkah-places.json`:
        - **Al Aziziyah is CORRECT** and always was — it resolves to relation
          19262643 (admin_level 10) with a real 2.66 x 2.85 km bbox, NOT a node.
          The earlier note in this file that called it suspect was wrong.
        - **Mount Arafat is CORRECT** — node/1236463804 matches the known
          Jabal ar-Rahmah coordinate, and its radius was already hand-set, so
          the placeholder bbox never reached the framing.
        - **Mina and Muzdalifah were framed from a PLACEHOLDER.** Nominatim
          gives every node a synthetic +/-0.02 deg bbox; both were using it.
          Mina now carries `radius: 2100` (half the E-W extent of the mapped
          valley, OSM way 1249259763, 3551 x 4228 m) and Muzdalifah `radius:
          1800` (OSM maps NO area for it at all; derived from the three mapped
          Muzdalifah metro stations, relations 7661455/6/7). Ranges moved
          6180 -> 5830 and 6180 -> 5000.
        - Positions themselves are unchanged: both nodes are OSM's official
          label points for those places.
- [x] **Light theme (RULE 14), DARK STILL THE DEFAULT.** See the section below.

## Light theme — how it is built, and why that way

`style.css` is a hand-tuned dark design, not a token system: 24 custom
properties (10 of them colours) against **914 hardcoded colour literals, 490
distinct, 352 used exactly once**. The accent hue appears as a literal 104
times against 75 uses of its own token. A hand-written light theme over that is
either too long to review or full of holes, and a hole in a light theme is an
invisible control.

So it is **derived**: `scripts/build-light-theme.mjs` emits
`light-theme.generated.css`, a `:root[data-theme='light']`-scoped twin of every
colour-bearing rule, with lightness flipped in OKLab and alpha preserved.

- **Dark is provably untouched.** Measured in the browser with no `data-theme`
  set: **all 486 light rules match zero elements.** Not "looks the same" —
  cannot apply.
- The flip is anchored on the two colours that decide readability
  (`--bg-dark` L 0.114 -> 0.98, `--text-primary` L 0.928 -> 0.20); the other
  488 follow from that line rather than being guessed one at a time.
- Shadows keep their hue and lose 45% of their alpha (a shadow is dark in both
  themes). Mask gradients are untouched — their colour channel is a stencil.
- Translucent TEXT gets `alpha ** 0.65`: 30% ink is ~3.0:1 on the dark ground
  but only ~2.0:1 on the light one, so a faithful flip would ship a light theme
  measurably harder to read than its parent.
- Four colours live outside CSS and were fixed at their source: the HUD palette
  (inline custom properties set from JS — it listens for `mashaer:theme-changed`
  and repaints), the scope-mask canvas vignette, the loader's error red, and
  the mic glyph. Each carries the same transform, so they are the same design.
- **One approximation, named**: `public/mic.svg` hardcodes `stroke="#36dcff"`
  and is consumed as `<img>`, which cannot inherit colour, so light mode uses a
  CSS `filter`. The exact fix is below, in the open list.
- Toggle in the top-centre nav; choice persisted; the theme is stamped by an
  inline script in `<head>` BEFORE first paint so a light visitor never sees a
  dark frame. `prefers-color-scheme` is deliberately NOT consulted — dark is
  the owner's default and the OS does not get to override it.
- Cost: CSS 194.93 -> 250.32 kB raw, **33.59 -> 42.10 kB gzipped**.

## Not delivered, and why

- [ ] ~~**Light theme (RULE 14).** NOT started.~~ DELIVERED, see above. The
      original objection stands as history: `style.css` carries **497 distinct
      colour literals** across 9,577 lines (360 of them used exactly once) against
      only 55 custom properties — it is a hand-tuned dark aesthetic, not a token
      system. A light theme is a redesign plus a design decision that is the
      owner's to make (what does a cyan glow on black become on white?), and a
      half-tokenised one ships a UI with invisible controls. Needs its own pass.
- [ ] **A real phone LAYOUT (RULE 14).** What landed are collision and sizing
      FIXES; the HUD is still a desktop-first design (left stack, right rail,
      bottom dock) and upstream says so in the CSS. No horizontal scroll at 375px,
      and the globe is usable, but it is not a designed mobile experience.
- [ ] **Mashaer Metro (Mina) POI** — geocoded and verified (`node/6024783454`,
      21.4184/39.8706) but LEFT OUT. Every preset must hold exactly 5 POIs because
      the location bar binds Q/W/E/R/T and a 6th stop is keyboard-unreachable
      (`src/ui.js`, `QWERTY_KEYS`). `holy-sites` is full and nothing there should
      be displaced for it.
## Open

- [ ] **Re-cut `public/mic.svg` to `currentColor`** and consume it as a
      `mask-image` the way `location.svg`, `pin.svg` and `visual-presets.svg`
      already are. That removes the one approximation in the light theme (today
      it is recoloured with a CSS `filter`). Touches
      `src/voice/mashaerRealtime.js:2563`, which sits near drift-pinned markup,
      so it wants its own pass rather than riding along with a layout change.
- [ ] **`#key-setup-chip` ("POWER UP · 8 KEYS WAITING") overlaps the dock at
      phone widths.** Cosmetic only and DEV-SERVER ONLY — verified in the
      production preview that `src/keySetup.js` removes both the chip and its
      dialog when `/api/setup/status` does not answer, so it never ships.
- [ ] Consider PRUNING the remaining upstream layers that are dead weight for a
      Haramain app (military flights, submarine cables, space missions). CCTV,
      CONTEXT and RADIO went this session; the DATA LAYERS list still carries
      the rest.
- [ ] **Mina's mapped area (OSM way 1249259763) is not in the Nominatim index**,
      so the generator cannot geocode to it directly — only its SIZE could be
      used, via the `radius` override. Giving `makkah-places.json` an explicit
      coordinate override would let Mina sit at the valley centre
      (21.41526, 39.88649) instead of OSM's label point 625 m east. Not done:
      it adds a second way to specify a place, and the label point is not wrong.
      The Overpass queries used to establish all of this were RESEARCH ONLY —
      no new data source entered the shipped pipeline, so DATA_SOURCES.md and
      the acknowledgements are unchanged.

## Also outstanding

- [ ] **Merge `mashaer-rebrand` → `main`**, and **commit this batch** — nothing
      here is committed yet.
- [ ] **API keys** (`GOOGLE_MAPS_API_KEY`, `CESIUM_ION_TOKEN`, `OPENAI_API_KEY`)
      are the owner's to add. NOTE: the keyless Esri stack DOES render and the
      camera DOES fly — see lessons.
