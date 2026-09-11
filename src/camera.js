import * as Cesium from 'cesium';

// The Kaaba, and the camera stand-off used for the opening shot.
//
// The camera sits DUE NORTH of the Kaaba looking south (heading 180), because a
// camera placed on the subject's own coordinates at a downward pitch points past
// it, not at it — the Austin default below does exactly that and gets away with
// it only because a whole downtown fills the frame. Here the subject is a single
// building, so the stand-off is computed rather than eyeballed: at a 30°
// depression the ground intercept is `heightAboveGround / tan(30°)`, so the
// height is DERIVED from the offset here rather than typed next to it, which
// keeps the Kaaba centred if either is ever retuned.
const HARAM_LAT = 21.4225;
const HARAM_LON = 39.8262;
/** Makkah's datum, matching `makkah.groundElevation` in the generated presets. */
const HARAM_GROUND_M = 290;
const HARAM_PITCH_DEG = -30;
const HARAM_STANDOFF_M = 600;
const HARAM_CAMERA_LAT = HARAM_LAT + HARAM_STANDOFF_M / 111320;
const HARAM_CAMERA_ALT_M = Math.round(
  HARAM_GROUND_M + HARAM_STANDOFF_M * Math.tan(Cesium.Math.toRadians(-HARAM_PITCH_DEG)),
);

/**
 * Camera presets for notable locations.
 * Default on load: the Haram in Makkah (see `flyToHaram`).
 */
export const CAMERA_PRESETS = {
  makkah: {
    destination: Cesium.Cartesian3.fromDegrees(HARAM_LON, HARAM_CAMERA_LAT, HARAM_CAMERA_ALT_M),
    orientation: {
      heading: Cesium.Math.toRadians(180),
      pitch: Cesium.Math.toRadians(HARAM_PITCH_DEG),
      roll: 0.0,
    },
  },
  austin: {
    destination: Cesium.Cartesian3.fromDegrees(-97.7431, 30.2672, 800),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-35),
      roll: 0.0,
    },
  },
  sf: {
    destination: Cesium.Cartesian3.fromDegrees(-122.4194, 37.7749, 1000),
    orientation: {
      heading: Cesium.Math.toRadians(30),
      pitch: Cesium.Math.toRadians(-30),
      roll: 0.0,
    },
  },
  nyc: {
    destination: Cesium.Cartesian3.fromDegrees(-73.9857, 40.7484, 1200),
    orientation: {
      heading: Cesium.Math.toRadians(-20),
      pitch: Cesium.Math.toRadians(-30),
      roll: 0.0,
    },
  },
};

/**
 * Fly the camera to a preset location with a smooth animation.
 */
export function flyToPreset(viewer, presetName, duration = 3.0) {
  const preset = CAMERA_PRESETS[presetName];
  if (!preset) return;

  viewer.camera.flyTo({
    destination: preset.destination,
    orientation: preset.orientation,
    duration,
    easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
  });
}

/**
 * Open on the Haram with a cinematic fly-in: a top-down establishing view from
 * 25 km, then a descent to the framed stand-off north of the Kaaba.
 *
 * This is the app's default opening shot. It needs no API key to RUN, but with
 * no `GOOGLE_MAPS_API_KEY` / `CESIUM_ION_TOKEN` there is nothing to see when it
 * arrives — the globe renders as bare stars for every city, not just this one.
 */
export function flyToHaram(viewer) {
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(HARAM_LON, HARAM_LAT, 25000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0.0,
    },
  });

  setTimeout(() => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(HARAM_LON, HARAM_CAMERA_LAT, HARAM_CAMERA_ALT_M),
      orientation: {
        heading: Cesium.Math.toRadians(180),
        pitch: Cesium.Math.toRadians(HARAM_PITCH_DEG),
        roll: 0.0,
      },
      duration: 4.0,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, 500);
}

/**
 * Set camera to Austin on load with a cinematic fly-in.
 *
 * NO LONGER THE DEFAULT (2026-09-11): `flyToHaram` opens the app instead, since
 * Mashaer is a Makkah/Madinah client. Kept and still exported — it is the
 * upstream opening shot, `austin` remains a shipped city preset, and the Austin
 * CCTV/bikeshare layers still point here.
 */
export function flyToAustin(viewer) {
  // Start from a high altitude, then fly down
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-97.7431, 30.2672, 25000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0.0,
    },
  });

  // Cinematic fly-in after a brief pause
  setTimeout(() => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(-97.7431, 30.2672, 600),
      orientation: {
        heading: Cesium.Math.toRadians(15),
        pitch: Cesium.Math.toRadians(-30),
        roll: 0.0,
      },
      duration: 4.0,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }, 500);
}
