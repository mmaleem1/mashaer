#!/usr/bin/env node
/**
 * Builds src/data/makkahPresets.generated.js from scripts/makkah-places.json.
 *
 * Three jobs, in order:
 *   1. GEOCODE every place against OpenStreetMap Nominatim, bounded to its
 *      region box. Bounding is not optional: the bare district names around
 *      Makkah collide with identically-named places elsewhere in the Kingdom
 *      (`العزيزية` alone resolves to Taif, ~60 km away).
 *   2. SAMPLE ground elevation for every resolved point from Open-Meteo, so a
 *      site's own height above the preset's datum is measured, not guessed.
 *   3. AUTO-FRAME each place from the real extent of its OSM feature, so a
 *      district the size of Al Awali pulls back and a single mosque does not.
 *
 * Every lookup is cached in scripts/fixtures/makkah-geocode-cache.json, which is
 * COMMITTED: the generator then reproduces byte-identical output offline, and the
 * cache doubles as the evidence record for where each coordinate came from.
 *
 * Usage:
 *   node scripts/build-makkah-presets.mjs            # cached where possible
 *   node scripts/build-makkah-presets.mjs --offline  # fail rather than hit network
 *   node scripts/build-makkah-presets.mjs --refresh  # ignore cache, re-fetch all
 *   node scripts/build-makkah-presets.mjs --check    # verify the committed output is current
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const INPUT = resolve(HERE, 'makkah-places.json');
const CACHE = resolve(HERE, 'fixtures/makkah-geocode-cache.json');
const OUTPUT = resolve(ROOT, 'src/data/makkahPresets.generated.js');

// Nominatim's usage policy caps automated clients at 1 request/second and
// requires an identifying User-Agent. We run well under it and cache, so a
// re-run after an edit costs one request per CHANGED place, not per place.
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const ELEVATION = 'https://api.open-meteo.com/v1/elevation';
const USER_AGENT = 'MakkahBirdsEyeView/1.0 (preset generator; OSM-bounded geocoding)';
const REQUEST_GAP_MS = 1200;

// ── Auto-framing ─────────────────────────────────────────────────────────────
// `alt` in CITY_POIS is RANGE — distance from the target, not an altitude.
// Fitting a feature of radius r into a camera with vertical half-angle θ needs
// range = r / tan(θ). Cesium's default frustum is 60° across, so θ ≈ 22.5° once
// the pitch foreshortening is allowed for; PAD leaves the subject off the edges.
const HALF_ANGLE_RAD = (22.5 * Math.PI) / 180;
const PAD = 1.15;
// A point feature (a mosque node, a summit node) has a near-zero OSM extent.
// Framing that literally puts the camera on the roof, so a point is treated as
// a 200 m subject — about a city block, which is what you actually want to see.
const MIN_RADIUS_M = 200;
const MIN_RANGE_M = 350;
const MAX_RANGE_M = 15000;
const METERS_PER_DEG_LAT = 111320;

/** Pitch band by subject size: wide areas read top-down, single buildings oblique. */
function autoPitch(radiusM) {
  if (radiusM > 3000) return -50;
  if (radiusM > 1200) return -42;
  if (radiusM > 400) return -34;
  return -26;
}

/**
 * Feature radius in metres from an OSM bounding box.
 * @param {[string,string,string,string]} bbox - Nominatim order: south, north, west, east.
 * @param {number} lat - Feature latitude, for the longitude-degree shrink.
 * @returns {number}
 */
function radiusFromBbox(bbox, lat) {
  const [south, north, west, east] = bbox.map(Number);
  const heightM = Math.abs(north - south) * METERS_PER_DEG_LAT;
  const widthM = Math.abs(east - west) * METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  return Math.max(heightM, widthM) / 2;
}

function autoRange(radiusM) {
  const effective = Math.max(radiusM, MIN_RADIUS_M);
  const range = (effective / Math.tan(HALF_ANGLE_RAD)) * PAD;
  return Math.round(Math.min(Math.max(range, MIN_RANGE_M), MAX_RANGE_M) / 10) * 10;
}

// ── Cache ────────────────────────────────────────────────────────────────────

function loadCache() {
  if (!existsSync(CACHE)) return { geocode: {}, elevation: {} };
  const parsed = JSON.parse(readFileSync(CACHE, 'utf8'));
  return { geocode: parsed.geocode || {}, elevation: parsed.elevation || {} };
}

function saveCache(cache) {
  mkdirSync(dirname(CACHE), { recursive: true });
  const sortedGeocode = Object.fromEntries(Object.entries(cache.geocode).sort(([a], [b]) => a.localeCompare(b)));
  const sortedElevation = Object.fromEntries(Object.entries(cache.elevation).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(CACHE, `${JSON.stringify({ geocode: sortedGeocode, elevation: sortedElevation }, null, 2)}\n`);
}

let lastRequestAt = 0;
async function throttle() {
  const waitMs = REQUEST_GAP_MS - (Date.now() - lastRequestAt);
  if (waitMs > 0) await new Promise((done) => setTimeout(done, waitMs));
  lastRequestAt = Date.now();
}

// ── Lookups ──────────────────────────────────────────────────────────────────

/**
 * Resolve one place name inside its region box.
 * @returns {{lat:number, lon:number, bbox:string[], displayName:string, osmId:string}}
 */
async function geocode(query, viewbox, { offline, refresh, cache }) {
  const key = `${viewbox}|${query}`;
  if (!refresh && cache.geocode[key]) return cache.geocode[key];
  if (offline) throw new Error(`--offline, but "${query}" is not in the cache. Run without --offline once.`);

  await throttle();
  const url = new URL(NOMINATIM);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('viewbox', viewbox);
  url.searchParams.set('bounded', '1');

  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`Nominatim ${response.status} for "${query}"`);
  const hits = await response.json();
  if (!Array.isArray(hits) || hits.length === 0) {
    // A miss must stop the build. Silently dropping a place would ship a preset
    // with a hole in it that nothing downstream could tell from a deliberate one.
    throw new Error(`No result inside the region box for "${query}". Check the name or widen the box.`);
  }

  const hit = hits[0];
  const resolved = {
    lat: Number(Number(hit.lat).toFixed(4)),
    lon: Number(Number(hit.lon).toFixed(4)),
    bbox: hit.boundingbox,
    displayName: hit.display_name,
    osmId: `${hit.osm_type}/${hit.osm_id}`,
  };
  cache.geocode[key] = resolved;
  return resolved;
}

/**
 * Ground elevation in metres for a batch of points (one request for all of them).
 * @returns {Map<string, number>} keyed "lat,lon"
 */
async function elevations(points, { offline, refresh, cache }) {
  const found = new Map();
  const missing = [];
  for (const point of points) {
    const key = `${point.lat},${point.lon}`;
    if (!refresh && cache.elevation[key] != null) found.set(key, cache.elevation[key]);
    else if (!missing.some((p) => `${p.lat},${p.lon}` === key)) missing.push(point);
  }
  if (missing.length === 0) return found;
  if (offline) throw new Error(`--offline, but ${missing.length} elevation(s) are not cached.`);

  await throttle();
  const url = new URL(ELEVATION);
  url.searchParams.set('latitude', missing.map((p) => p.lat).join(','));
  url.searchParams.set('longitude', missing.map((p) => p.lon).join(','));
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`Open-Meteo elevation ${response.status}`);
  const { elevation } = await response.json();
  if (!Array.isArray(elevation) || elevation.length !== missing.length) {
    throw new Error(`Open-Meteo returned ${elevation?.length} elevations for ${missing.length} points`);
  }
  missing.forEach((point, index) => {
    const key = `${point.lat},${point.lon}`;
    cache.elevation[key] = elevation[index];
    found.set(key, elevation[index]);
  });
  return found;
}

// ── Tours → scene recipes ────────────────────────────────────────────────────
// The scene director speaks a DIFFERENT camera language from the POI presets:
// a recipe keyframe is the camera's own {lat, lon, alt-above-ellipsoid}, while a
// POI's `alt` is RANGE to a target the camera orbits. Flying a POI tour by
// dropping the POI's coordinates straight into a keyframe would park the camera
// directly above the subject pointing at the horizon — which at the 500-900 m
// ranges here means framing empty hillside. So each beat is converted properly:
// stand the camera off by range along the reverse bearing, and lift it by the
// vertical leg of the same triangle.
//
// The director also has NO orbit primitive (two writers on the camera is its
// documented jitter failure), so an orbiting beat is expanded the way the
// shipped `city-overload` recipe does it: consecutive keyframes on the same
// subject with stepped headings.

const ORBIT_STEPS_DEG = [0, 45, 90];
const DEFAULT_FLY_S = 4;

function cameraKeyframe(poi, groundElevation, { heading, durationS, holdS }) {
  const tiltRad = (Math.abs(poi.pitch) * Math.PI) / 180;
  const bearingRad = (((heading + 180) % 360) * Math.PI) / 180;
  const targetHeight = groundElevation + poi.buildingHeight;

  const cameraHeight = targetHeight + poi.alt * Math.sin(tiltRad);
  const groundDistance = poi.alt * Math.cos(tiltRad);
  const dLat = (groundDistance * Math.cos(bearingRad)) / METERS_PER_DEG_LAT;
  const dLon = (groundDistance * Math.sin(bearingRad))
    / (METERS_PER_DEG_LAT * Math.cos((poi.lat * Math.PI) / 180));

  return {
    lat: Number((poi.lat + dLat).toFixed(5)),
    lon: Number((poi.lon + dLon).toFixed(5)),
    alt: Math.round(cameraHeight),
    heading,
    pitch: poi.pitch,
    roll: 0,
    duration: durationS,
    hold: holdS,
  };
}

function tourToRecipe(tour, byId) {
  const cameraPath = [];

  for (const beat of tour.beats) {
    const preset = byId.get(beat.preset);
    const poi = preset.pois.find((candidate) => candidate.name === beat.poi);
    const holdS = beat.holdS ?? 4;

    if (!beat.orbit) {
      cameraPath.push(cameraKeyframe(poi, preset.groundElevation, {
        heading: poi.heading,
        durationS: beat.flyS ?? DEFAULT_FLY_S,
        holdS,
      }));
      continue;
    }

    // Arrive, then walk the camera round the subject. The arrival keyframe holds
    // only briefly because the orbit legs are themselves the dwell.
    const legS = Math.max(1.8, Number((holdS / ORBIT_STEPS_DEG.length).toFixed(1)));
    ORBIT_STEPS_DEG.forEach((offset, index) => {
      cameraPath.push(cameraKeyframe(poi, preset.groundElevation, {
        heading: (poi.heading + offset) % 360,
        durationS: index === 0 ? (beat.flyS ?? DEFAULT_FLY_S) : legS,
        holdS: index === 0 ? 0.4 : 0.6,
      }));
    });
  }

  const durationSec = Math.round(
    cameraPath.reduce((total, frame) => total + frame.duration + frame.hold, 0),
  );

  return {
    id: tour.id,
    title: tour.name,
    durationSec,
    // A clean, unfiltered look: these are real places, and a thermal or
    // surveillance grade over them would be a stylistic claim the footage
    // should not make. Detection overlays stay OFF for the same reason.
    style: 'normal',
    ui: { hidePanels: true, hudMode: 'minimal', safeFrame: '16:9' },
    // No layers asserted — the tour is about the ground, and every recipe is
    // capped at four declared layers by src/scenes/scenePolicy.test.mjs.
    layers: {},
    post: { bloom: 40, sharpen: true, detectionMode: 'OFF' },
    cameraPath,
  };
}

// ── Emit ─────────────────────────────────────────────────────────────────────

function renderPoi(poi) {
  const fields = [
    `name: ${JSON.stringify(poi.name)}`,
    `lat: ${poi.lat}`,
    `lon: ${poi.lon}`,
    `alt: ${poi.alt}`,
    `pitch: ${poi.pitch}`,
    `heading: ${poi.heading}`,
    `buildingHeight: ${poi.buildingHeight}`,
  ];
  return `      { ${fields.join(', ')} },`;
}

function renderPreset(preset) {
  const lines = [
    `  ${JSON.stringify(preset.id)}: {`,
    `    name: ${JSON.stringify(preset.name)},`,
    `    groundElevation: ${preset.groundElevation},`,
    `    viewBounds: { southwest: { lat: ${preset.viewBounds.southwest.lat}, lng: ${preset.viewBounds.southwest.lng} },`
      + ` northeast: { lat: ${preset.viewBounds.northeast.lat}, lng: ${preset.viewBounds.northeast.lng} } },`,
    '    pois: [',
    ...preset.pois.map(renderPoi),
    '    ],',
    '  },',
  ];
  return lines.join('\n');
}

function renderFile(presets, recipes, sourceDigest) {
  return `/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Source:    scripts/makkah-places.json
 * Generator: scripts/build-makkah-presets.mjs
 * Rebuild:   npm run build:makkah-presets
 *
 * Coordinates are OpenStreetMap (ODbL) features resolved inside a region box;
 * ground elevations are Open-Meteo samples. Camera range and pitch are derived
 * from each feature's real OSM extent — see the generator for the framing maths.
 *
 * Source digest: ${sourceDigest}
 */

/** @type {Record<string, object>} Presets in CITY_POIS shape. */
export const MAKKAH_PRESETS = Object.freeze({
${presets.map(renderPreset).join('\n')}
});

/**
 * Self-flying tours over the presets above, already in SCENE_RECIPES shape:
 * keyframes carry the CAMERA's own position and absolute altitude, stood off
 * from each subject so the POI fills the frame, and orbiting beats are expanded
 * into stepped-heading keyframes because the director has no orbit primitive.
 */
export const MAKKAH_SCENE_RECIPES = Object.freeze(${JSON.stringify(recipes, null, 2)});
`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const flags = new Set(process.argv.slice(2));
  const options = {
    offline: flags.has('--offline') || flags.has('--check'),
    refresh: flags.has('--refresh'),
    cache: loadCache(),
  };
  const check = flags.has('--check');

  const spec = JSON.parse(readFileSync(INPUT, 'utf8'));
  const sourceDigest = createHash('sha256').update(readFileSync(INPUT)).digest('hex').slice(0, 16);

  // Pass 1 — resolve every place, so elevations can go out as one batched call
  // rather than one request per POI (30 requests saved on a cold cache).
  const resolved = [];
  for (const preset of spec.presets) {
    const region = spec.regions[preset.region];
    if (!region) throw new Error(`Preset "${preset.id}" names unknown region "${preset.region}"`);
    for (const place of preset.places) {
      const hit = await geocode(place.query, region.viewbox, options);
      resolved.push({ preset, place, hit });
      if (!check) console.log(`  ${place.label.padEnd(26)} ${hit.lat}, ${hit.lon}  ${hit.osmId}`);
    }
  }

  const groundByPoint = await elevations(resolved.map((r) => r.hit), options);
  const elevationAt = (hit) => groundByPoint.get(`${hit.lat},${hit.lon}`) ?? 0;

  // Pass 2 — build each preset. Its datum is its FIRST place's ground: that is
  // the fallback flyToLandmark uses when Google 3D Tiles leave globe terrain
  // unsampled, which is always true on the first fly-to of a session.
  const presets = spec.presets.map((preset) => {
    const rows = resolved.filter((r) => r.preset.id === preset.id);
    // The datum is the preset's LOWEST ground, not its first POI's: that keeps
    // every buildingHeight non-negative and makes the number mean one plain
    // thing — how far above the preset's floor to aim.
    const groundElevation = Math.round(Math.min(...rows.map((row) => elevationAt(row.hit))));

    const pois = rows.map(({ place, hit }) => {
      // OSM nodes (every summit here, and some district centroids) carry a
      // placeholder bounding box unrelated to the real subject, so a mountain
      // would otherwise frame like a street corner. `radius` overrides it.
      const radiusM = place.radius ?? radiusFromBbox(hit.bbox, hit.lat);
      const ownGround = elevationAt(hit);
      return {
        name: place.label,
        lat: hit.lat,
        lon: hit.lon,
        alt: place.range ?? autoRange(radiusM),
        pitch: place.pitch ?? autoPitch(radiusM),
        heading: place.heading ?? 0,
        // The camera targets groundElevation + buildingHeight, so buildingHeight
        // must carry BOTH the structure's own height and this site's rise above
        // the preset datum — otherwise Arafah's summit frames at Haram's floor.
        buildingHeight: Math.round(ownGround - groundElevation + (place.structureHeight ?? 0)),
      };
    });

    const lats = pois.map((p) => p.lat);
    const lons = pois.map((p) => p.lon);
    const margin = 0.02; // ~2 km of breathing room around the outermost POI
    const round = (value) => Number(value.toFixed(3));

    return {
      id: preset.id,
      name: preset.name,
      groundElevation,
      viewBounds: {
        southwest: { lat: round(Math.min(...lats) - margin), lng: round(Math.min(...lons) - margin) },
        northeast: { lat: round(Math.max(...lats) + margin), lng: round(Math.max(...lons) + margin) },
      },
      pois,
    };
  });

  // Every tour beat must name a real preset and a real POI inside it. A typo
  // here would otherwise surface as a tour that silently skips a stop.
  const byId = new Map(presets.map((preset) => [preset.id, preset]));
  for (const tour of spec.tours) {
    for (const beat of tour.beats) {
      const preset = byId.get(beat.preset);
      if (!preset) throw new Error(`Tour "${tour.id}" beat names unknown preset "${beat.preset}"`);
      if (!preset.pois.some((poi) => poi.name === beat.poi)) {
        throw new Error(`Tour "${tour.id}" beat names unknown POI "${beat.poi}" in preset "${beat.preset}"`);
      }
    }
  }

  const recipes = spec.tours.map((tour) => tourToRecipe(tour, byId));
  const rendered = renderFile(presets, recipes, sourceDigest);

  if (check) {
    const current = existsSync(OUTPUT) ? readFileSync(OUTPUT, 'utf8') : '';
    if (current !== rendered) {
      console.error('makkahPresets.generated.js is STALE — run `npm run build:makkah-presets`.');
      process.exit(1);
    }
    console.log('makkahPresets.generated.js is up to date.');
    return;
  }

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, rendered);
  saveCache(options.cache);

  const poiCount = presets.reduce((total, preset) => total + preset.pois.length, 0);
  console.log(`\nWrote ${presets.length} presets / ${poiCount} POIs / ${spec.tours.length} tours -> src/data/makkahPresets.generated.js`);
}

main().catch((error) => {
  console.error(`\nbuild-makkah-presets failed: ${error.message}`);
  process.exit(1);
});
