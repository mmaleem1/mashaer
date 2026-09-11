// Pins how a SAVED project picks up recipes shipped after it was created.
//
// Built-ins used to be seeded only into a brand-new project, so every returning
// user — anyone with a `mashaer.sceneProject.v2` key — would never see a
// scene added in a later release. The Makkah and Madinah tours are exactly that
// case, and "it works on a fresh profile" is how this kind of gap ships unnoticed.
//
// The other half of the contract matters just as much: a user who DELETED a
// built-in must not find it back the next time they load. `seededRecipeIds` is
// what separates the two, so both directions are pinned here.
import assert from 'node:assert/strict';
import test from 'node:test';

import { SceneDirector } from './director.js';
import { SCENE_RECIPES } from './recipes.js';

const MAKKAH_TOUR_IDS = ['hajj-route', 'madinah-ziyarah'];

/** Stub the browser globals the director touches, headlessly. */
function installSceneRuntime(project) {
  const originalDocument = globalThis.document;
  const originalLocalStorage = globalThis.localStorage;
  const noopClassList = { add() {}, remove() {}, toggle() {}, contains: () => false };
  const saved = [];

  globalThis.document = {
    getElementById: () => null,
    createElement: () => ({ classList: noopClassList, style: {}, appendChild() {}, remove() {} }),
    addEventListener() {},
    removeEventListener() {},
    body: { classList: noopClassList, appendChild() {} },
  };
  globalThis.localStorage = {
    getItem: () => (project === null ? null : JSON.stringify(project)),
    setItem: (_key, value) => saved.push(value),
    removeItem() {},
  };

  return {
    saved,
    restore() {
      globalThis.document = originalDocument;
      globalThis.localStorage = originalLocalStorage;
    },
  };
}

function listScenes(project) {
  const runtime = installSceneRuntime(project);
  try {
    return new SceneDirector({ scene: {}, camera: {} }, null, null).listScenes();
  } finally {
    runtime.restore();
  }
}

/** A project saved before `seededRecipeIds` existed, holding only the old built-ins. */
function legacyProject() {
  return {
    version: 3,
    scenes: SCENE_RECIPES
      .filter((recipe) => !MAKKAH_TOUR_IDS.includes(recipe.id))
      .map((recipe) => ({
        id: recipe.id,
        title: recipe.title,
        shots: [{
          id: `${recipe.id}-shot`,
          title: 'Shot',
          durationSec: 1,
          holdSec: 0,
          camera: { lat: 0, lon: 0, alt: 500000, heading: 0, pitch: -40, roll: 0 },
          visual: { style: 'normal' },
          layers: {},
        }],
      })),
  };
}

test('a fresh project ships every built-in recipe', () => {
  const ids = listScenes(null).map((scene) => scene.id);
  for (const recipe of SCENE_RECIPES) {
    assert.ok(ids.includes(recipe.id), `a new project must include "${recipe.id}"`);
  }
});

test('a project saved before the tours existed gains them on load', () => {
  const before = legacyProject();
  assert.ok(
    !before.scenes.some((scene) => MAKKAH_TOUR_IDS.includes(scene.id)),
    'fixture must start without the tours, or this test proves nothing',
  );

  const ids = listScenes(before).map((scene) => scene.id);
  for (const tourId of MAKKAH_TOUR_IDS) {
    assert.ok(ids.includes(tourId), `a saved project must pick up "${tourId}"`);
  }
  // The user's own scenes survive the seeding.
  for (const scene of before.scenes) {
    assert.ok(ids.includes(scene.id), `seeding dropped the existing scene "${scene.id}"`);
  }
});

test('a deleted built-in stays deleted', () => {
  // Same missing tours as above — but this project RECORDS having been offered
  // them, so their absence is a decision, not a gap.
  const project = legacyProject();
  project.seededRecipeIds = SCENE_RECIPES.map((recipe) => recipe.id);

  const ids = listScenes(project).map((scene) => scene.id);
  for (const tourId of MAKKAH_TOUR_IDS) {
    assert.ok(!ids.includes(tourId), `"${tourId}" was deleted and must not return`);
  }
});

test('a captured scene alone is never mistaken for a full built-in set', () => {
  // A project holding only the user's own capture has no recipe ids in it, so
  // the legacy fallback (read the seeded set from the scenes present) records
  // nothing — and every built-in is offered.
  const project = {
    version: 3,
    scenes: [{
      id: 'scene_abc123',
      title: 'My Capture',
      shots: [{
        id: 'shot_1',
        title: 'Shot',
        durationSec: 1,
        holdSec: 0,
        camera: { lat: 21.42, lon: 39.83, alt: 900, heading: 0, pitch: -30, roll: 0 },
        visual: { style: 'normal' },
        layers: {},
      }],
    }],
  };

  const ids = listScenes(project).map((scene) => scene.id);
  assert.ok(ids.includes('scene_abc123'), 'the captured scene must survive');
  for (const recipe of SCENE_RECIPES) {
    assert.ok(ids.includes(recipe.id), `built-in "${recipe.id}" must be offered`);
  }
});
