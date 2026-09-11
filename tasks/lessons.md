# Mashaer — lessons

## §1 A blanket CSS override at the end of a stylesheet defeats every media query it touches

Appending `#command-dock { bottom: calc(2vh + env(safe-area-inset-bottom, 0px)); }`
to the end of `style.css` silently erased the `@media (max-width: 720px)` rule that
anchors the dock at `8px`. Same specificity, later in the file, no media condition —
so it won at every width. `creditAttribution.test.mjs` caught it by asserting the
literal declaration at 720px.

The general trap: a "harmless additive" override is only additive if nothing else
declares that property. Before adding one, grep for **every** declaration of that
property on that selector — there were 3 for `#left-panel-stack`'s `bottom` and 9
for `#command-dock`'s, spread across four media blocks. Fixing one of three looks
like it worked, because the browser quietly keeps using the last.

## §2 `viewport-fit=cover` is a commitment to inset ~25 anchors, not a meta tag

Turning it on means every viewport-anchored fixed box needs a safe-area inset, at
its ORIGINAL declaration site and in each of its breakpoint variants (see §1). The
cheap alternative is not to set it: iOS then letterboxes the app inside the safe
area by itself. Cost is a band of background on notched phones; benefit is not
touching 25 anchors that each have their own overrides.

## §3 Read the assertion MESSAGE, not just the diff

Two failures this session were the guard being right and the code being wrong:

- "unmodelled function in dock bottom" → my `env()` had overridden a breakpoint.
- "at 720px the rail is height-capped, so its bottom anchor no longer decides its
  floor" → stated the exact CSS rule (over-constraint needs top AND bottom AND a
  height). The fix was to set `top: auto`, which makes the cap safe, and to teach
  the guard that distinction rather than delete the assertion.

Relaxing a guard is only honest if you then prove it still fails for the dangerous
case: restoring the `top` anchor beside the cap was re-run and went red, then green
again on restore.

## §4 A test comment can carry a hard UI constraint

`makkahPresets.test.mjs` asserts exactly 5 POIs per preset. It reads like a style
preference; the comment says why — the location bar binds `Q/W/E/R/T` and a 6th POI
is unreachable. Verified in `src/ui.js`: `QWERTY_KEYS.indexOf(e.key)` returns -1 for
anything else, so the pill renders with a "6" label that no key activates. Three
planned additions were restructured into new presets because of it. Check what a
guard is protecting before deciding it is arbitrary.

## §5 The service worker cached the very thing its own doc said it never would

The first version passed same-origin GETs through a network-first branch that cached
any 200. One page load put `/api/setup/status` and `/api/google/nearby-places` into
the shell cache — live data, and exactly what the header comment promised to refuse.
Found by listing `caches` contents in the page, not by reading the code.

Lesson: for a cache, the test is "what is IN it after a real load", not "what does
the code appear to do". `isLiveData()` now excludes `/api/*`, and the VERSION bump
purges the poisoned caches (that purge path was then verified too).

## §6 Offline shell, proven by stopping the server

`preview_stop`, then reload: the document and `style.css` still served (200 from
cache), `/api/setup/status` correctly failed. A registered worker in `activated`
state proves nothing about caching on its own.

## §7 The keyless Esri stack renders, and the camera flies

Earlier notes said that without `GOOGLE_MAPS_API_KEY` / `CESIUM_ION_TOKEN` the globe
is bare stars and **no city flies**. Not what happens: the app falls back to the
Esri imagery stack, imagery renders, and `flyToHaram` arrives — confirmed in the
preview build and in the owner's own browser, whose URL hash read
`lat=21.4279&lon=39.8262&alt=637&heading=180&pitch=-30`, the computed stand-off.
Keys buy Google Photorealistic 3D Tiles, not the ability to move the camera.

## §8 Present, correct, and invisible

`CITY_POIS` spread the generated presets LAST, so the location row opened on Austin
and all eight Makkah/Madinah pills were off the right-hand end of a scrolling row.
The owner reported Mina, Muzdalifah, Arafat and Aziziyah as missing; they were
built, tested, reachable by voice, and three pills past the edge of the screen.
Object insertion order is the rendered order — for a Makkah app, Makkah goes first.

## §9 Inherited set dressing becomes a claim when the app changes

Upstream's HUD simulated a reconnaissance downlink: a classification-and-handling
banner, ids named after a real imaging-satellite family, invented orbit/pass
numbers, a blinking red "REC". Read as genre styling on a general-purpose globe; on
a Makkah and Madinah client it reads as an assertion — and "REC" claimed a recording
that never happens (RULE 10). Re-theming kept every computed readout and replaced
only the invented ones.

## §10 `replace_all` will rewrite the comment you just wrote explaining the change

Replacing the banner string everywhere also rewrote the sentence inside the new
comment that quoted the old string, leaving it self-contradictory. Write the
explanatory comment AFTER the sweep, or describe the old value instead of quoting
it.

## §11 Geocode before naming the group

Five candidate districts were geocoded first, then grouped and named from where they
actually landed — Al Hujun/Al Utaybiyah/Rea Zakhir/Ar Rashidiyah/Ash Shara'i are
genuinely north and north-east, so `makkah-north` is accurate. Naming the preset
first would have forced places into a label that did not describe them. Three
candidates were dropped outright: `النكاسة` returned nothing bounded, and `الشامية`
and `القشاشية` resolved to an 11 m amenity and a 94 m building rather than the
districts of those names.

## §12 "Overlapping" controls were labels escaping their boxes, not boxes colliding

The bottom dock read as three controls stacked on each other. Measured, the boxes
were adjacent and did NOT intersect: location 212–280, voice 280–420, presets
420–488. What overlapped was TEXT — the labels carry `width: max-content` and
`overflow: visible`, so at a 700px viewport "LOCATION" was an 84px string painting
out of a 44px box and "VISUAL PRESETS" a 130px string in the same 44px box, both
running under the raised voice panel between them.

Truncation existed but only from 620px down, and only as `max-width: 2.3rem` +
ellipsis — "LOC…" / "VIS…". Between 621px and 720px nothing clipped them at all.
Fixed by going icon-only below 720px: each wing already has a masked SVG icon and
each toggle already has a full `aria-label`, and the icon survives `font-size: 0`
because it is sized in `rem`, not `em`.

Lesson: measure the BOXES before believing a visual overlap. `getBoundingClientRect`
intersection said no collision, which is what pointed at the text.

## §13 A panel that defaults open costs the most on the smallest screen

`global-context-panel` opened to 255px of "SELECT CONTEXT — nearest planes ·
vessels · sites": instructions for a choice not yet made, over a third of a phone
screen, in an app whose point is the view underneath. Beside a desktop globe it
costs nothing, which is why it was never noticed.

Fixed with a first-visit, width-aware default in `_restorePanelCollapsedState`
(`isNarrowLayout()`, 720px to match the CSS) — the same treatment `pp-toggles`
already had, and a stored choice still wins in both directions. Rail 255px → 166px,
visible globe 30% → 46% of a 700x900 window.

## §14 A hardcoded max-width is an off-screen bug on a narrow viewport

`.hud-summary-wrap { max-width: 420px }` with the HUD inset 39px from the left ran
84px off a 375px screen. The summary already ellipsised — it was ellipsising past
the edge, which looks like text running off rather than a width bug.
`min(420px, calc(100vw - 78px))` keeps the design width where it fits.

## §15 An ID in the selector you are overriding is an ID you must match

The chip-grid rules were written as `#left-panel-stack > .panel-collapsible.collapsed`
— one ID, two classes. The stacked-layout rule they had to beat is
`#left-panel-stack > #data-panel.collapsed { width: 100% }` — TWO IDs. Mine lost,
silently: no error, no warning, every chip just stayed full-width and the change
looked like it had done nothing.

Same failure mode as §1 (later-in-file wins) but by the other axis. When overriding
an existing rule, read ITS selector and match or exceed it, rather than writing the
selector that reads most naturally.

## §16 `overflow-wrap: anywhere` breaks inside words

Reached for it to make chip labels wrap in a 109px cell. It rendered "CONTEXT" as
"CO / NT / EX / T" and "SCENES" as "SCENE / S". `anywhere` means *anywhere*,
including mid-word. For "wrap at spaces, and only at spaces", use
`overflow-wrap: normal` with `word-break: keep-all`.

## §17 A decorative flex child will take the pixels the label needed

Labels were still clipped after the cell widths were right. Measured: `.panel-title`
is `flex: 0 1 auto` (shrinks) while the decorative `.panel-divider` between label
and button is `flex: 1 1 0%` (grows). In a 109px cell "SCENES" got 34px for a 40px
word and "CONTEXT" got 12px for 38px — the rule was winning the space.

Fix was to hide the divider and give the label `flex: 1 1 auto`. Lesson: when text
is clipped, enumerate the flex siblings and their `flex` values before touching
font-size.

## §18 When a guard's PREMISE changes, rewrite the proof — do not delete the guard

Moving the context rail from bottom-anchored to top-anchored invalidated the credit
guard's reasoning ("the rail's floor must clear the credit"), because with
`bottom: auto` there is no floor to reason about. The obligation was unchanged:
Google and Cesium still require the credit visible.

So the proof changed shape rather than going away — assert `top + max-height` (the
lowest a capped box can reach) sits above the credit band at every modelled
viewport, both numbers read from the stylesheet. Then MUTATION-TEST it: raising the
cap 180px → 400px failed at 18 width×height combinations with the exact overlap in
pixels. A rewritten guard that has never been seen to fail is not a guard.

## §19 A generated theme beats a hand-written one when the design is not tokenised

`style.css` has 24 custom properties and 914 hardcoded colour literals — 490
distinct, 352 used exactly once. Any hand-written light theme over that is a
choice between a list too long to review and a list with holes, and a hole in a
light theme is a control you cannot see.

Deriving it instead removes the choice: for every rule that paints a colour,
emit a `:root[data-theme='light']` twin with the colour transformed. Complete by
construction, because the same pass produced both halves.

The property that makes it safe is the one worth remembering: adding a constant
`(0,2,0)` to EVERY light selector preserves the specificity ORDER of the
originals among themselves. So whichever dark rule wins an element, its light
twin wins it too — no override-chasing, no `!important`.

And it is provable rather than eyeballed: with no `data-theme` set, all 486
light rules match **zero** elements. "Dark is unchanged" stopped being a claim.

## §20 A code generator will eat its own output

The first version re-read the hand-tuned light rules at the end of `style.css`
and emitted doubly-scoped copies with the flip applied a SECOND time — turning
every hand-picked light value straight back into the dark one it replaced.

Two rules came out of it:
- Skip anything already written for the target of the transform.
- Then CARRY IT FORWARD to the end of the generated file. The hand-tuned block
  lives in the file that loads FIRST, so at equal specificity the generated twin
  wins and the hand-tuning silently does nothing. Re-emitting it last is what
  makes "hand-tuned" mean anything.

And carry forward only rules that are light-scoped in EVERY comma-part: one
half-scoped selector (`#theme-toggle .theme-toggle-light, :root[data-theme=
'light'] ...`) put an unscoped rule inside a file whose entire contract is that
nothing in it touches the dark theme. A test caught it.

## §21 A faithful colour flip ships a WORSE theme, and the asymmetry is measurable

30% ink is 30% ink in both directions, but 30% white over `#0a0a0f` lands near
3.0:1 contrast while 30% black over `#ededf5` lands near 2.0:1. Flipping
translucent text faithfully therefore produces a light theme measurably harder
to read than the dark one it came from — "Initializing systems…" was legible on
black and a ghost on white.

`alpha ** 0.65` lifts the faint end without touching the opaque end and without
reordering anything (0.3→0.45, 0.5→0.64, 0.9→0.93, 1.0→1.0), so every "dimmer
than" relationship the design expresses survives.

The same asymmetry bites halos. Text floating over satellite imagery used a DARK
shadow for legibility; flip the text and keep the shadow and you get dark on
dark — the one combination that reads as neither. A generator cannot tell a
halo from a drop shadow, so the four places it matters are named by hand and the
generator is left honest.

## §22 "Replace these with radio buttons" was a request about LOOK, not semantics

The owner asked for the five chips to become radio buttons aligned with "the
current 3 radio buttons". Neither group is a radio group: the chips are
independent collapsible panels, and src/ui.js:3983 says outright that both dock
trays can be pinned open at the same time. `role="radio"` would have told a
screen reader that exactly one of them is selected, which is false.

The ask underneath was symmetry, and symmetry is what shipped — uniform cells,
`aria-expanded` kept. Read a UI request for the outcome it wants, then say
plainly which part of the literal wording you are not doing and why.

## §23 Arithmetic before agreeing

I proposed pruning to "6, not 8" and then listed five things. The sixth was
DISPLAY (`#pp-toggles`), which I had missed because it is a top-level element in
index.html that JavaScript re-parents into the right rail at runtime — so
reading the markup undercounts the panels and only the runtime DOM is right.

The number happened to survive the mistake. It did not have to. Count against
the live DOM, not the file, whenever JavaScript moves things.

## §24 I relapsed on the piped-exit-status trap, in the same session I quoted it

RULE 18 names it, `tasks/lessons.md` restates it, and I still wrote:

```bash
npm ci --silent 2>&1 | tail -3 && echo "npm ci OK"
```

`&&` read `tail`'s status, not npm's. `npm ci` had failed in a postinstall
hook, leaving `node_modules` half-installed — and I printed "npm ci OK" and
moved on. The next command reported **96 test failures**, and for a moment I
was looking for the bug in a lock file I had just regenerated.

Knowing the rule is not the same as having the habit. The habit is:

```bash
set -o pipefail; cmd 2>&1 | tail -5; echo "exit=${PIPESTATUS[0]}"
# or, when the output does not matter:
cmd >/dev/null 2>&1; echo "exit=$?"
```

Second-order lesson, and the more useful one: **when a change produces a wildly
disproportionate failure, suspect the environment before the change.** A
two-line edit to a `name` field cannot break 96 tests. The real cause was a
corrupt `~/.cache/puppeteer` directory — the browser folder present, the
executable missing — which aborted `npm ci` in puppeteer's postinstall. GitHub
CI had passed the same commit minutes earlier on a clean runner. Green CI and a
broken local tree are perfectly compatible, and each one alone tells you
nothing about the other.

## §25 A fork inherits an IDENTITY, not just code — and the rename does not touch it

The rebrand renamed every internal identifier, every CSS prefix and every
storage namespace. Nine things still pointed at upstream afterwards, because
none of them is *code*:

- `CODEOWNERS` — every PR here auto-requested review from two people who do not
  maintain this fork.
- `SECURITY.md` — private vulnerability reports went to upstream's advisory page.
- README and CONTRIBUTING clone URLs — following the setup installed a
  DIFFERENT APPLICATION than the one being read about.
- A "one click, no terminal" install path pointing at a Pinokio listing for the
  upstream app. There is no listing for this fork, so that path could not
  possibly produce it.
- Outbound `User-Agent` and `Referer` to CelesTrak and Nominatim. Our traffic
  went out under upstream's name, and any rate limit or block it earned would
  have landed on them. Both providers require a contact point exactly so they
  can reach whoever is generating the load — giving them the wrong one is worse
  than giving them none.
- Upstream's accolades (#1 on GitHub Trending, Product Hunt, a press quote)
  presented as this project's, which had existed for one day and had 0 stars.
- `package-lock.json` still declaring the old package name.

The pattern: grep for the old NAME and you find the code. The identity hides in
the places that name a PERSON, a REPOSITORY or a CONTACT — owners files,
security policy, clone commands, install listings, and any header that
introduces you to a third party. Sweep for those specifically.

The line between the two is not "does it mention upstream". LICENSE, the fork
notice and the attribution block must mention upstream — that is the MIT
obligation. The test is: **is this sentence crediting them, or is it standing in
for us?** Credit stays. Standing-in gets corrected.

## §26 Retiring a feature from the UI silently makes the documentation lie

CCTV, Context and Radio went behind one CSS block. The code, the tests and the
markup were all still correct, so nothing failed — and README and
`docs/CURRENT-STATE.md` went on telling readers to "hit NEAREST in the CCTV
panel" and "turn on the Radio layer", steps that cannot be performed.

A retirement has a documentation half. And here the right fix was NOT to delete
those sections: they accurately describe code that still exists and comes back
by deleting one block. What was missing was a single statement, up front, that
the panels are not on screen — so the descriptions read as capability rather
than as instructions.

Same session, same shape as §23: the change was correct, the thing describing
the change was not.

## §27 A rename leaves the OLD path unguarded in .gitignore

`.gev-logs/` became `.mashaer-logs/`, and `.gitignore` was updated to the new
name — only the new name. Then an untracked `.gev-logs/` appeared, holding the
voice debug log, which contains TRANSCRIBED CONVERSATION, in a repository that
is public.

The cause was not a code bug: nothing in the tree writes that path any more
(grepped the whole tree, and a freshly booted server does not recreate it). It
was a long-running preview process holding pre-rename config in memory. But the
cause hardly matters — an old checkout, a stale process or a colleague who has
not pulled produces the same untracked directory, and it is one `git add -A`
from being published.

So when a path that holds anything sensitive is renamed, **keep ignoring the old
one**. An obsolete ignore rule costs nothing; a missing one costs a disclosure.
Verified with `git check-ignore -v`, which names the rule and line that matched
rather than leaving you to assume.
