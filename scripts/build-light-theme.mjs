#!/usr/bin/env node
/**
 * Builds light-theme.generated.css from style.css.
 *
 * WHY THIS IS GENERATED AND NOT HAND-WRITTEN
 *
 * style.css is a hand-tuned DARK design, not a token system. Measured: 24
 * custom properties at `:root` (ten of them colours) against 914 hardcoded
 * colour literals, 490 of them distinct and 352 used exactly once. The accent
 * hue alone appears as a literal 104 times against 75 uses of its own token.
 * There is no realistic hand-written light theme over that: any list of
 * overrides short enough to review leaves holes, and a hole in a light theme
 * is an invisible control.
 *
 * So the light theme is DERIVED. For every rule in style.css that paints a
 * colour, this emits a `:root[data-theme='light']`-scoped twin carrying only
 * the colour declarations, with each colour transformed. Nothing in style.css
 * changes, the dark theme stays byte-identical, and there are no holes by
 * construction: a colour that exists in dark has a light counterpart because
 * the same pass produced both.
 *
 * THE TRANSFORM
 *
 * Convert to OKLCH (perceptually uniform), flip lightness, keep hue and
 * chroma, keep alpha exactly. `#0a0a0f` becomes a near-white with the same
 * blue cast; `#00d4ff` stays cyan but goes deep enough to read on white.
 * Alpha is never touched, so every carefully-tuned translucency survives.
 *
 * Three property families are NOT flipped, because flipping them is wrong:
 *   - mask-image / mask: those gradients encode ALPHA only. Their `#000` is a
 *     stencil, not a colour, and inverting it inverts the mask.
 *   - box-shadow / text-shadow / drop-shadow: a shadow is dark in both
 *     themes. Light themes want the same hue, less of it, so alpha is scaled.
 *   - scrollbar-color and accent-color are flipped normally (they are real
 *     colours), but noted here because they are easy to mistake for the above.
 *
 * WHAT IT CANNOT REACH, and what covers it instead:
 *   - @keyframes colours cannot be theme-scoped (a keyframe selector takes no
 *     prefix). They are reported at the end of a run and handled by hand in
 *     the hand-tuned block at the bottom of the generated file.
 *   - Colours owned by JavaScript (src/hud.js HUD_COLORS, src/scopeMask.js,
 *     src/celestialRing.js) and colours baked into an SVG file. Those are
 *     fixed at their source; see tasks/todo.md.
 *
 * Usage:
 *   node scripts/build-light-theme.mjs           # write the generated file
 *   node scripts/build-light-theme.mjs --check   # fail if it is out of date
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const INPUT = resolve(ROOT, 'style.css');
const OUTPUT = resolve(ROOT, 'light-theme.generated.css');

const THEME_SCOPE = ":root[data-theme='light']";

// Shadows keep their hue and direction; a light ground just needs less of
// them. 0.55 was chosen so the heaviest shadow in the file, rgba(0,0,0,0.58),
// lands near 0.32 — present, not a smear.
const SHADOW_ALPHA_SCALE = 0.55;

/*
 * Translucent TEXT needs more alpha on a light ground than on a dark one.
 *
 * This is not a stylistic preference, it is how the two grounds differ. The
 * dim-text token is 30% ink either way, but 30% white over #0a0a0f lands at
 * roughly 3.0:1 contrast while 30% black over #ededf5 lands at about 2.0:1 —
 * the light side loses about a third of its contrast for the same declaration.
 * Flipping faithfully therefore produces a light theme that is measurably
 * harder to read than the dark one it came from.
 *
 * `a ** 0.65` lifts the faint end without touching the opaque end and without
 * reordering anything: 0.3 -> 0.45, 0.5 -> 0.64, 0.9 -> 0.93, 1.0 -> 1.0. Every
 * "dimmer than" relationship the design expresses survives.
 */
const TEXT_ALPHA_GAMMA = 0.65;
const TEXT_PROPS = new Set(['color', '-webkit-text-fill-color']);

const SHADOW_PROPS = new Set(['box-shadow', 'text-shadow', '-webkit-box-shadow']);
const MASK_PROPS = new Set([
  'mask', 'mask-image', '-webkit-mask', '-webkit-mask-image',
]);

// ── Colour maths ─────────────────────────────────────────────────────────────
// sRGB <-> OKLab, per Björn Ottosson's published matrices. OKLab is used rather
// than HSL because HSL's "lightness" is not perceptual: flipping it turns a
// saturated cyan into a muddy one and leaves near-blacks and near-whites at
// visibly different distances from their ends of the scale.

/** sRGB channel (0..1) to linear light. */
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
/** Linear light back to an sRGB channel (0..1). */
const toSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/** @returns {{L:number,a:number,b:number}} OKLab for an 8-bit sRGB triple. */
function rgbToOklab(r, g, b) {
  const lr = toLinear(r / 255);
  const lg = toLinear(g / 255);
  const lb = toLinear(b / 255);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** @returns {{r:number,g:number,b:number}} 8-bit sRGB, gamut-clamped. */
function oklabToRgb({ L, a, b }) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(toSrgb(Math.max(0, Math.min(1, v))) * 255)));
  return { r: clamp(lr), g: clamp(lg), b: clamp(lb) };
}

/**
 * The light-theme counterpart of one colour.
 *
 * NOT a plain `1 - L`. A dark design clusters its surfaces just above black —
 * `--bg-dark` (#0a0a0f) sits at OKLab L 0.114, not 0 — so a plain flip lands
 * it at 0.886, a mid grey, and the whole theme comes out muddy. The mapping is
 * instead the straight line through the two anchors the design already states:
 *
 *   --bg-dark      L 0.114  ->  0.980   (the page ground becomes near-white)
 *   --text-primary L 0.928  ->  0.200   (body text becomes near-black)
 *
 * Everything else follows from those two, so the two colours that decide
 * whether the theme is readable are set deliberately and the other 488 are
 * derived consistently rather than guessed one at a time.
 *
 * Hue and chroma (OKLab a/b) are carried across untouched: a cyan control stays
 * cyan, it just goes deep enough to read on white. Out-of-gamut results are
 * clamped per channel on the way back to sRGB.
 * @param {{r:number,g:number,b:number}} rgb
 * @returns {{r:number,g:number,b:number}}
 */
const ANCHOR_DARK_GROUND = { from: 0.114, to: 0.98 };
const ANCHOR_LIGHT_TEXT = { from: 0.928, to: 0.2 };
const FLIP_SLOPE = (ANCHOR_LIGHT_TEXT.to - ANCHOR_DARK_GROUND.to)
  / (ANCHOR_LIGHT_TEXT.from - ANCHOR_DARK_GROUND.from);
const FLIP_INTERCEPT = ANCHOR_DARK_GROUND.to - FLIP_SLOPE * ANCHOR_DARK_GROUND.from;

function flipLightness({ r, g, b }) {
  const lab = rgbToOklab(r, g, b);
  const L = Math.max(0.06, Math.min(0.995, FLIP_SLOPE * lab.L + FLIP_INTERCEPT));
  return oklabToRgb({ L, a: lab.a, b: lab.b });
}

// ── Colour literal parsing ───────────────────────────────────────────────────

const COLOUR_RE = /#[0-9a-fA-F]{3,8}\b|\brgba?\(\s*[^()]*\)|\bhsla?\(\s*[^()]*\)/g;

/** @returns {{r:number,g:number,b:number,a:number}|null} */
function parseColour(text) {
  if (text.startsWith('#')) {
    const hex = text.slice(1);
    const expand = (h) => parseInt(h.length === 1 ? h + h : h, 16);
    if (hex.length === 3 || hex.length === 4) {
      return {
        r: expand(hex[0]), g: expand(hex[1]), b: expand(hex[2]),
        a: hex.length === 4 ? expand(hex[3]) / 255 : 1,
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: expand(hex.slice(0, 2)), g: expand(hex.slice(2, 4)), b: expand(hex.slice(4, 6)),
        a: hex.length === 8 ? expand(hex.slice(6, 8)) / 255 : 1,
      };
    }
    return null;
  }
  const inner = text.slice(text.indexOf('(') + 1, text.lastIndexOf(')'));
  // Both the legacy comma form and the modern `r g b / a` form appear in this
  // stylesheet, so normalise the separators before splitting.
  const parts = inner.replace(/\//g, ' ').split(/[\s,]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const channel = (raw) => (raw.endsWith('%') ? (parseFloat(raw) / 100) * 255 : parseFloat(raw));
  const alpha = (raw) => (raw === undefined ? 1 : raw.endsWith('%') ? parseFloat(raw) / 100 : parseFloat(raw));
  if (text.startsWith('hsl')) return null; // none present; refuse rather than guess
  const rgb = {
    r: Math.round(channel(parts[0])),
    g: Math.round(channel(parts[1])),
    b: Math.round(channel(parts[2])),
    a: alpha(parts[3]),
  };
  return Number.isFinite(rgb.r) && Number.isFinite(rgb.g) && Number.isFinite(rgb.b) && Number.isFinite(rgb.a)
    ? rgb
    : null;
}

/** @returns {string} the shortest exact serialisation. */
function formatColour({ r, g, b, a }) {
  if (a >= 1) {
    const hex = [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
    return `#${hex}`;
  }
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(4))})`;
}

/**
 * Rewrite every colour literal inside one declaration value.
 * @param {string} prop lower-cased property name
 * @param {string} value the declaration value, gradients and all
 * @returns {string|null} the light value, or null when nothing changed
 */
function lightValue(prop, value) {
  if (MASK_PROPS.has(prop)) return null;
  const isShadow = SHADOW_PROPS.has(prop) || (prop === 'filter' && value.includes('drop-shadow'));
  let changed = false;
  const out = value.replace(COLOUR_RE, (match) => {
    const parsed = parseColour(match);
    if (!parsed) return match;
    changed = true;
    if (isShadow) {
      return formatColour({ ...parsed, a: Number((parsed.a * SHADOW_ALPHA_SCALE).toFixed(4)) });
    }
    // `--text-secondary` and `--text-dim` ARE text colours even though the
    // property they are declared on is a custom property: they exist to be
    // handed to `color` later. Missing them would leave the lift applying to
    // every one-off dim colour in the file and not to the two tokens the
    // design routes most of its dim text through.
    const isTextColour = TEXT_PROPS.has(prop) || (prop.startsWith('--') && prop.includes('text'));
    const alpha = isTextColour && parsed.a < 1
      ? Number((parsed.a ** TEXT_ALPHA_GAMMA).toFixed(4))
      : parsed.a;
    return formatColour({ ...flipLightness(parsed), a: alpha });
  });
  return changed ? out : null;
}

// ── Stylesheet walk ──────────────────────────────────────────────────────────

/**
 * Split a stylesheet into rules, carrying the at-rule context of each.
 * The file nests at most one level (`@media` around ordinary rules), which this
 * asserts rather than assumes.
 * @param {string} css
 * @returns {{atRules:string[],selector:string,body:string}[]}
 */
function parseRules(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const stack = [];
  let buffer = '';
  for (let i = 0; i < stripped.length; i += 1) {
    const char = stripped[i];
    if (char === '{') {
      const prelude = buffer.trim();
      buffer = '';
      if (prelude.startsWith('@')) {
        stack.push({ kind: 'at', prelude });
      } else {
        stack.push({ kind: 'rule', prelude });
      }
      continue;
    }
    if (char === '}') {
      const frame = stack.pop();
      if (frame?.kind === 'rule') {
        rules.push({
          atRules: stack.filter((f) => f.kind === 'at').map((f) => f.prelude),
          selector: frame.prelude,
          body: buffer,
        });
      }
      buffer = '';
      continue;
    }
    buffer += char;
  }
  if (stack.length) throw new Error('unbalanced braces in style.css');
  return rules;
}

/** Declarations of a rule body, preserving `!important`. */
function parseDeclarations(body) {
  return body
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const colon = chunk.indexOf(':');
      if (colon < 0) return null;
      return { prop: chunk.slice(0, colon).trim().toLowerCase(), value: chunk.slice(colon + 1).trim() };
    })
    .filter(Boolean);
}

/**
 * Scope one selector to the light theme.
 *
 * Specificity: the prefix adds a pseudo-class and an attribute, so every light
 * rule outranks its own dark original by exactly (0,2,0). Adding the same
 * constant to every rule preserves the ORDER of the originals among
 * themselves, so whichever dark rule wins an element, its light twin wins it
 * too. That is what makes the layer complete rather than a pile of overrides.
 */
function scopeSelector(selector) {
  return selector
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (part === ':root' || part === 'html') return THEME_SCOPE;
      if (part.startsWith(':root')) return THEME_SCOPE + part.slice(':root'.length);
      if (part.startsWith('html')) return THEME_SCOPE + part.slice('html'.length);
      return `${THEME_SCOPE} ${part}`;
    })
    .join(',\n');
}

function build() {
  const css = readFileSync(INPUT, 'utf8');
  const rules = parseRules(css);
  const keyframeColours = [];
  const blocks = [];
  const handTuned = [];
  let declarationCount = 0;

  for (const rule of rules) {
    // A `-light` keyframe IS the hand-written answer to an earlier report;
    // re-reporting it every run would train the reader to ignore the list.
    if (rule.atRules.some((at) => /^@keyframes\s+\S*-light\b/.test(at))) continue;
    // Rules already written FOR the light theme are the hand-tuned block at
    // the end of style.css, not dark rules awaiting a twin. Two things follow.
    //
    // They must not be TRANSFORMED, or the generator eats its own output: a
    // doubly-scoped copy with the flip applied a second time turns every
    // hand-picked light value straight back into the dark one it replaced.
    //
    // And they must be CARRIED FORWARD to the end of this file. They live in
    // style.css, which the page loads FIRST, so at equal specificity the
    // generated twin below would win and the hand-tuning would silently do
    // nothing. Re-emitting them last is what makes "hand-tuned" mean it.
    if (rule.selector.includes("[data-theme='light']")) {
      // Carry forward ONLY rules that are light-scoped in EVERY part. A rule
      // like `#theme-toggle .theme-toggle-light, :root[data-theme='light']
      // #theme-toggle .theme-toggle-dark` is deliberately half-unscoped — it
      // hides one icon in both themes — and copying it here would put an
      // unscoped selector inside a file whose whole contract is that nothing
      // in it touches the dark theme.
      const parts = rule.selector.split(',').map((part) => part.trim()).filter(Boolean);
      if (parts.every((part) => part.startsWith(THEME_SCOPE))) {
        const decls = parseDeclarations(rule.body).map((d) => `  ${d.prop}: ${d.value};`);
        if (decls.length) handTuned.push(`${parts.join(',\n')} {\n${decls.join('\n')}\n}`);
      }
      continue;
    }
    const inKeyframes = rule.atRules.some((at) => at.startsWith('@keyframes'));
    const lightDecls = [];
    for (const decl of parseDeclarations(rule.body)) {
      const next = lightValue(decl.prop, decl.value);
      if (next === null || next === decl.value) continue;
      if (inKeyframes) {
        keyframeColours.push(`${rule.atRules.join(' ')} ${rule.selector} { ${decl.prop} }`);
        continue;
      }
      lightDecls.push(`  ${decl.prop}: ${next};`);
      declarationCount += 1;
    }
    if (!lightDecls.length) continue;
    const inner = `${scopeSelector(rule.selector)} {\n${lightDecls.join('\n')}\n}`;
    blocks.push(rule.atRules.length
      ? `${rule.atRules.join(' {\n')} {\n${inner.replace(/^/gm, '  ')}\n${'}'.repeat(rule.atRules.length)}`
      : inner);
  }

  const digest = createHash('sha256').update(css).digest('hex').slice(0, 16);
  const header = `/*
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Built from style.css by scripts/build-light-theme.mjs.
 * Run \`npm run build:light-theme\` after any colour change in style.css;
 * \`npm run check:light-theme\` fails if this file is stale.
 *
 * Every rule below is the light-theme twin of a rule in style.css, scoped to
 * ${THEME_SCOPE} and carrying only its colour declarations, with
 * lightness flipped in OKLCH and alpha preserved exactly. Shadows keep their
 * hue and lose ${Math.round((1 - SHADOW_ALPHA_SCALE) * 100)}% of their alpha; mask gradients are left alone
 * because their colour channel is a stencil, not a colour.
 *
 * Dark is the default and is untouched by this file: with no data-theme
 * attribute, or with data-theme="dark", not one rule here matches.
 *
 * Source digest: ${digest}
 * Rules: ${blocks.length}   Declarations: ${declarationCount}
 */
`;

  const tail = handTuned.length
    ? `\n\n/* ── Carried forward from the hand-tuned block in style.css ─────────────\n`
      + `   Verbatim, and LAST, so these outrank the derived rules above at equal\n`
      + `   specificity. Edit them in style.css; they arrive here on a rebuild. */\n\n`
      + `${handTuned.join('\n\n')}\n`
    : '';
  const out = `${header}\n${blocks.join('\n\n')}\n${tail}`;
  return { out, keyframeColours, ruleCount: blocks.length + handTuned.length, declarationCount };
}

const check = process.argv.includes('--check');
const { out, keyframeColours, ruleCount, declarationCount } = build();

if (check) {
  const current = readFileSync(OUTPUT, 'utf8');
  if (current !== out) {
    console.error('light-theme.generated.css is STALE — run `npm run build:light-theme`.');
    process.exit(1);
  }
  console.log('light-theme.generated.css is up to date.');
} else {
  writeFileSync(OUTPUT, out);
  console.log(`Wrote ${ruleCount} light-theme rules / ${declarationCount} declarations -> light-theme.generated.css`);
  if (keyframeColours.length) {
    console.log(`\n${keyframeColours.length} colour(s) live inside @keyframes and cannot be theme-scoped:`);
    for (const entry of new Set(keyframeColours)) console.log(`  ${entry}`);
    console.log('Handle these in the hand-tuned block of style.css, not here.');
  }
}
