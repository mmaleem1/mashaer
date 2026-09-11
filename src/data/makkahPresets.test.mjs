import assert from 'node:assert/strict';
import test from 'node:test';

import { MAKKAH_PRESETS, MAKKAH_SCENE_RECIPES } from './makkahPresets.generated.js';
import { CITY_POIS } from '../locations.js';

const METERS_PER_DEG_LAT = 111320;
const PRESET_IDS = Object.keys(MAKKAH_PRESETS);

/** Region boxes from scripts/makkah-places.json, restated as the assertion. */
const REGIONS = {
  makkah: { south: 21.28, north: 21.55, west: 39.72, east: 40.05 },
  madinah: { south: 24.38, north: 24.58, west: 39.50, east: 39.72 },
};
const REGION_OF = {
  makkah: 'makkah',
  'makkah-central': 'makkah',
  'makkah-south': 'makkah',
  'makkah-west': 'makkah',
  'makkah-haram': 'makkah',
  'makkah-north': 'makkah',
  'holy-sites': 'makkah',
  madinah: 'madinah',
};

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Bearing and depression angle from a camera keyframe to a target point.
 * @returns {{bearingDeg:number, depressionDeg:number, groundM:number}}
 */
function sightLine(camera, target, targetHeightM) {
  const northM = (target.lat - camera.lat) * METERS_PER_DEG_LAT;
  const eastM = (target.lon - camera.lon) * METERS_PER_DEG_LAT * Math.cos(toRadians(target.lat));
  const groundM = Math.hypot(northM, eastM);
  const bearingDeg = (((Math.atan2(eastM, northM) * 180) / Math.PI) + 360) % 360;
  const depressionDeg = (Math.atan2(camera.alt - targetHeightM, groundM) * 180) / Math.PI;
  return { bearingDeg, depressionDeg, groundM };
}

/** Smallest absolute difference between two bearings, in degrees. */
function bearingDelta(a, b) {
  return Math.abs(((a - b + 540) % 360) - 180);
}

test('the generated presets reach CITY_POIS', () => {
  for (const id of PRESET_IDS) {
    assert.ok(CITY_POIS[id], `preset "${id}" must be spread into CITY_POIS`);
    assert.equal(CITY_POIS[id].name, MAKKAH_PRESETS[id].name);
  }
  // The location bar hands out Q/W/E/R/T, so a preset with a sixth POI would
  // render a stop no key can reach.
  for (const id of PRESET_IDS) {
    assert.equal(MAKKAH_PRESETS[id].pois.length, 5, `preset "${id}" must hold exactly 5 POIs`);
  }
});

test('no generated preset id collides with a hand-written city', () => {
  const handWritten = ['austin', 'sf', 'nyc', 'tokyo', 'london', 'paris', 'dubai', 'dc'];
  for (const id of PRESET_IDS) {
    assert.ok(!handWritten.includes(id), `"${id}" would silently overwrite a shipped city`);
  }
});

test('every POI resolved inside its own region box', () => {
  // The bounded geocode is the only thing standing between "Al Aziziyah, Makkah"
  // and the identically-named district in Taif, 60 km away. A coordinate that
  // escapes its box means the bound was lost, and the name matched elsewhere.
  for (const [id, preset] of Object.entries(MAKKAH_PRESETS)) {
    const box = REGIONS[REGION_OF[id]];
    for (const poi of preset.pois) {
      assert.ok(
        poi.lat >= box.south && poi.lat <= box.north,
        `${poi.name} latitude ${poi.lat} is outside the ${REGION_OF[id]} box`,
      );
      assert.ok(
        poi.lon >= box.west && poi.lon <= box.east,
        `${poi.name} longitude ${poi.lon} is outside the ${REGION_OF[id]} box`,
      );
    }
  }
});

test('every POI carries a usable camera pose', () => {
  const names = new Set();
  for (const [id, preset] of Object.entries(MAKKAH_PRESETS)) {
    assert.ok(Number.isFinite(preset.groundElevation), `${id} needs a ground datum`);
    for (const poi of preset.pois) {
      assert.ok(!names.has(`${id}/${poi.name}`), `duplicate POI ${poi.name} in ${id}`);
      names.add(`${id}/${poi.name}`);
      // The datum is the preset's LOWEST ground, so nothing sits below it.
      assert.ok(poi.buildingHeight >= 0, `${poi.name} has a negative buildingHeight`);
      assert.ok(poi.alt >= 350 && poi.alt <= 15000, `${poi.name} range ${poi.alt} is out of band`);
      assert.ok(poi.pitch < 0 && poi.pitch >= -60, `${poi.name} pitch ${poi.pitch} is out of band`);
      assert.ok(poi.heading >= 0 && poi.heading < 360, `${poi.name} heading ${poi.heading} is out of band`);
    }
  }
});

test('every tour keyframe actually frames one of the real sites', () => {
  // THE load-bearing test. A scene keyframe is the CAMERA's own position and
  // absolute altitude, while a POI's `alt` is range to a target — so the
  // conversion has to stand the camera off along the reverse bearing and lift
  // it by the vertical leg. Get that wrong in either direction and the tour
  // still runs, still looks smooth, and points at bare hillside the whole way.
  //
  // Rather than replay the generator's own maths (which would pass on a shared
  // bug), this walks every keyframe and asks whether SOME real POI sits exactly
  // where that camera is looking.
  const targets = [];
  for (const preset of Object.values(MAKKAH_PRESETS)) {
    for (const poi of preset.pois) {
      targets.push({ poi, heightM: preset.groundElevation + poi.buildingHeight });
    }
  }

  assert.ok(MAKKAH_SCENE_RECIPES.length > 0, 'no tours were generated');

  for (const recipe of MAKKAH_SCENE_RECIPES) {
    for (const [index, frame] of recipe.cameraPath.entries()) {
      const aimed = targets.filter(({ poi, heightM }) => {
        const line = sightLine(frame, poi, heightM);
        return bearingDelta(line.bearingDeg, frame.heading) <= 1.5
          && Math.abs(line.depressionDeg - Math.abs(frame.pitch)) <= 1.5;
      });
      assert.ok(
        aimed.length > 0,
        `${recipe.id} keyframe ${index} (heading ${frame.heading}, pitch ${frame.pitch}) `
        + 'points at no site in the presets',
      );
    }
  }
});

test('tour keyframes clear the director\'s altitude floor', () => {
  // normalizeShot() clamps alt to >= 100 m. A keyframe under the floor would be
  // silently rewritten, and the shot it belongs to would quietly stop matching
  // the framing this file just proved.
  for (const recipe of MAKKAH_SCENE_RECIPES) {
    for (const frame of recipe.cameraPath) {
      assert.ok(frame.alt >= 100, `${recipe.id} keyframe altitude ${frame.alt} is under the floor`);
      assert.ok(frame.duration >= 0.2, `${recipe.id} keyframe duration is under the floor`);
      assert.ok(frame.hold >= 0, `${recipe.id} keyframe hold is negative`);
    }
  }
});

test('tours declare no layers and a plain visual grade', () => {
  // scenePolicy caps a recipe at four declared layers; these assert none, and
  // leave the imagery ungraded — a thermal or surveillance filter over these
  // particular places would be a claim the footage should not make.
  for (const recipe of MAKKAH_SCENE_RECIPES) {
    assert.equal(Object.keys(recipe.layers).length, 0, `${recipe.id} should declare no layers`);
    assert.equal(recipe.style, 'normal');
    assert.equal(recipe.post.detectionMode, 'OFF');
    assert.ok(recipe.durationSec > 0);
    assert.ok(recipe.id && recipe.title, 'a tour needs an id and a title');
  }
});
