/**
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
 * Source digest: f3f9302848128918
 */

/** @type {Record<string, object>} Presets in CITY_POIS shape. */
export const MAKKAH_PRESETS = Object.freeze({
  "makkah": {
    name: "Makkah",
    groundElevation: 290,
    viewBounds: { southwest: { lat: 21.357, lng: 39.781 }, northeast: { lat: 21.488, lng: 39.88 } },
    pois: [
      { name: "Kaaba / Masjid al-Haram", lat: 21.4225, lon: 39.8262, alt: 690, pitch: -26, heading: 180, buildingHeight: 7 },
      { name: "Makkah Royal Clock Tower", lat: 21.4189, lon: 39.8254, alt: 890, pitch: -26, heading: 30, buildingHeight: 220 },
      { name: "Jabal al-Nour", lat: 21.4578, lon: 39.8597, alt: 2500, pitch: -34, heading: 225, buildingHeight: 250 },
      { name: "Jabal Thawr", lat: 21.377, lon: 39.8499, alt: 1940, pitch: -34, heading: 315, buildingHeight: 418 },
      { name: "Masjid Aisha (Taneem)", lat: 21.4677, lon: 39.8014, alt: 560, pitch: -26, heading: 90, buildingHeight: 16 },
    ],
  },
  "makkah-central": {
    name: "Ajyad & Aziziyah",
    groundElevation: 296,
    viewBounds: { southwest: { lat: 21.397, lng: 39.794 }, northeast: { lat: 21.456, lng: 39.876 } },
    pois: [
      { name: "Ajyad", lat: 21.4179, lon: 39.8292, alt: 2320, pitch: -34, heading: 0, buildingHeight: 59 },
      { name: "Al Aziziyah", lat: 21.4166, lon: 39.8551, alt: 3950, pitch: -42, heading: 0, buildingHeight: 28 },
      { name: "Al Shisha", lat: 21.4299, lon: 39.8558, alt: 6180, pitch: -42, heading: 0, buildingHeight: 43 },
      { name: "Al Ma'abdah", lat: 21.4356, lon: 39.846, alt: 3770, pitch: -42, heading: 0, buildingHeight: 51 },
      { name: "Jarwal", lat: 21.4278, lon: 39.8142, alt: 2130, pitch: -34, heading: 0, buildingHeight: 0 },
    ],
  },
  "makkah-south": {
    name: "Al Awali & Al Naseem",
    groundElevation: 252,
    viewBounds: { southwest: { lat: 21.32, lng: 39.793 }, northeast: { lat: 21.398, lng: 39.925 } },
    pois: [
      { name: "Batha Quraish", lat: 21.3652, lon: 39.8297, alt: 5400, pitch: -42, heading: 0, buildingHeight: 0 },
      { name: "Al Naseem", lat: 21.3717, lon: 39.8727, alt: 6200, pitch: -42, heading: 0, buildingHeight: 15 },
      { name: "Al Awali", lat: 21.3398, lon: 39.9045, alt: 13190, pitch: -50, heading: 0, buildingHeight: 47 },
      { name: "Al Hijrah", lat: 21.3739, lon: 39.8507, alt: 6300, pitch: -42, heading: 0, buildingHeight: 423 },
      { name: "Al Kaakiyah", lat: 21.3776, lon: 39.8128, alt: 4740, pitch: -42, heading: 0, buildingHeight: 28 },
    ],
  },
  "makkah-west": {
    name: "Al Zahir & Khalidiyah",
    groundElevation: 231,
    viewBounds: { southwest: { lat: 21.367, lng: 39.741 }, northeast: { lat: 21.569, lng: 39.822 } },
    pois: [
      { name: "Al Zahir", lat: 21.4472, lon: 39.7952, alt: 4570, pitch: -42, heading: 0, buildingHeight: 119 },
      { name: "Al Rusaifah", lat: 21.4138, lon: 39.787, alt: 3760, pitch: -42, heading: 0, buildingHeight: 40 },
      { name: "Al Khalidiyah", lat: 21.4023, lon: 39.8015, alt: 3650, pitch: -42, heading: 0, buildingHeight: 73 },
      { name: "Al Shawqiyah", lat: 21.3872, lon: 39.7965, alt: 4630, pitch: -42, heading: 0, buildingHeight: 30 },
      { name: "Al Nuwariyah", lat: 21.5495, lon: 39.7608, alt: 11710, pitch: -50, heading: 0, buildingHeight: 0 },
    ],
  },
  "makkah-haram": {
    name: "Around the Haram",
    groundElevation: 282,
    viewBounds: { southwest: { lat: 21.385, lng: 39.783 }, northeast: { lat: 21.457, lng: 39.849 } },
    pois: [
      { name: "Jabal Omar", lat: 21.4232, lon: 39.8177, alt: 1110, pitch: -26, heading: 270, buildingHeight: 137 },
      { name: "Masjid al-Jinn", lat: 21.4335, lon: 39.829, alt: 560, pitch: -26, heading: 270, buildingHeight: 33 },
      { name: "Jannat al-Mu'alla", lat: 21.4369, lon: 39.829, alt: 1030, pitch: -26, heading: 270, buildingHeight: 48 },
      { name: "Al Misfalah", lat: 21.405, lon: 39.8223, alt: 2160, pitch: -34, heading: 0, buildingHeight: 12 },
      { name: "Al Hindawiyah", lat: 21.4154, lon: 39.8026, alt: 2600, pitch: -34, heading: 0, buildingHeight: 0 },
    ],
  },
  "makkah-north": {
    name: "Al Hujun & Shara'i",
    groundElevation: 304,
    viewBounds: { southwest: { lat: 21.417, lng: 39.795 }, northeast: { lat: 21.502, lng: 40.002 } },
    pois: [
      { name: "Al Hujun", lat: 21.4369, lon: 39.8149, alt: 1730, pitch: -34, heading: 0, buildingHeight: 0 },
      { name: "Al Utaybiyah", lat: 21.4513, lon: 39.816, alt: 3640, pitch: -42, heading: 0, buildingHeight: 64 },
      { name: "Rea Zakhir", lat: 21.464, lon: 39.836, alt: 2220, pitch: -34, heading: 0, buildingHeight: 25 },
      { name: "Ar Rashidiyah", lat: 21.4815, lon: 39.982, alt: 4820, pitch: -42, heading: 0, buildingHeight: 87 },
      { name: "Ash Shara'i", lat: 21.4645, lon: 39.9484, alt: 4160, pitch: -42, heading: 0, buildingHeight: 86 },
    ],
  },
  "holy-sites": {
    name: "Holy Sites",
    groundElevation: 310,
    viewBounds: { southwest: { lat: 21.333, lng: 39.853 }, northeast: { lat: 21.441, lng: 40.004 } },
    pois: [
      { name: "Mina", lat: 21.4154, lon: 39.8925, alt: 5830, pitch: -42, heading: 0, buildingHeight: 69 },
      { name: "Jamarat Bridge", lat: 21.4208, lon: 39.8732, alt: 1110, pitch: -26, heading: 180, buildingHeight: 76 },
      { name: "Muzdalifah", lat: 21.3863, lon: 39.9151, alt: 5000, pitch: -42, heading: 0, buildingHeight: 9 },
      { name: "Mount Arafat", lat: 21.3548, lon: 39.9841, alt: 1250, pitch: -34, heading: 270, buildingHeight: 2 },
      { name: "Masjid Namirah", lat: 21.353, lon: 39.9663, alt: 690, pitch: -26, heading: 45, buildingHeight: 15 },
    ],
  },
  "madinah": {
    name: "Madinah",
    groundElevation: 605,
    viewBounds: { southwest: { lat: 24.419, lng: 39.559 }, northeast: { lat: 24.543, lng: 39.638 } },
    pois: [
      { name: "Al-Masjid an-Nabawi", lat: 24.4687, lon: 39.6112, alt: 830, pitch: -26, heading: 0, buildingHeight: 30 },
      { name: "Quba Mosque", lat: 24.4394, lon: 39.6175, alt: 560, pitch: -26, heading: 315, buildingHeight: 17 },
      { name: "Masjid al-Qiblatayn", lat: 24.4842, lon: 39.5789, alt: 560, pitch: -26, heading: 90, buildingHeight: 15 },
      { name: "Mount Uhud", lat: 24.5227, lon: 39.6183, alt: 6940, pitch: -42, heading: 0, buildingHeight: 307 },
      { name: "Jannat al-Baqi", lat: 24.4667, lon: 39.6162, alt: 690, pitch: -26, heading: 270, buildingHeight: 0 },
    ],
  },
});

/**
 * Self-flying tours over the presets above, already in SCENE_RECIPES shape:
 * keyframes carry the CAMERA's own position and absolute altitude, stood off
 * from each subject so the POI fills the frame, and orbiting beats are expanded
 * into stepped-heading keyframes because the director has no orbit primitive.
 */
export const MAKKAH_SCENE_RECIPES = Object.freeze([
  {
    "id": "hajj-route",
    "title": "The Hajj Route",
    "durationSec": 65,
    "style": "normal",
    "ui": {
      "hidePanels": true,
      "hudMode": "minimal",
      "safeFrame": "16:9"
    },
    "layers": {},
    "post": {
      "bloom": 40,
      "sharpen": true,
      "detectionMode": "OFF"
    },
    "cameraPath": [
      {
        "lat": 21.42807,
        "lon": 39.8262,
        "alt": 599,
        "heading": 180,
        "pitch": -26,
        "roll": 0,
        "duration": 4,
        "hold": 0.4
      },
      {
        "lat": 21.42644,
        "lon": 39.83043,
        "alt": 599,
        "heading": 225,
        "pitch": -26,
        "roll": 0,
        "duration": 2,
        "hold": 0.6
      },
      {
        "lat": 21.4225,
        "lon": 39.83218,
        "alt": 599,
        "heading": 270,
        "pitch": -26,
        "roll": 0,
        "duration": 2,
        "hold": 0.6
      },
      {
        "lat": 21.37648,
        "lon": 39.8925,
        "alt": 4280,
        "heading": 0,
        "pitch": -42,
        "roll": 0,
        "duration": 4,
        "hold": 5
      },
      {
        "lat": 21.3548,
        "lon": 39.9941,
        "alt": 1011,
        "heading": 270,
        "pitch": -34,
        "roll": 0,
        "duration": 4,
        "hold": 0.4
      },
      {
        "lat": 21.34822,
        "lon": 39.99117,
        "alt": 1011,
        "heading": 315,
        "pitch": -34,
        "roll": 0,
        "duration": 2,
        "hold": 0.6
      },
      {
        "lat": 21.34549,
        "lon": 39.9841,
        "alt": 1011,
        "heading": 0,
        "pitch": -34,
        "roll": 0,
        "duration": 2,
        "hold": 0.6
      },
      {
        "lat": 21.34906,
        "lon": 39.96207,
        "alt": 627,
        "heading": 45,
        "pitch": -26,
        "roll": 0,
        "duration": 4,
        "hold": 4
      },
      {
        "lat": 21.35292,
        "lon": 39.9151,
        "alt": 3665,
        "heading": 0,
        "pitch": -42,
        "roll": 0,
        "duration": 4,
        "hold": 5
      },
      {
        "lat": 21.42976,
        "lon": 39.8732,
        "alt": 873,
        "heading": 180,
        "pitch": -26,
        "roll": 0,
        "duration": 4,
        "hold": 5
      },
      {
        "lat": 21.42807,
        "lon": 39.8262,
        "alt": 599,
        "heading": 180,
        "pitch": -26,
        "roll": 0,
        "duration": 4,
        "hold": 0.4
      },
      {
        "lat": 21.42644,
        "lon": 39.83043,
        "alt": 599,
        "heading": 225,
        "pitch": -26,
        "roll": 0,
        "duration": 2.7,
        "hold": 0.6
      },
      {
        "lat": 21.4225,
        "lon": 39.83218,
        "alt": 599,
        "heading": 270,
        "pitch": -26,
        "roll": 0,
        "duration": 2.7,
        "hold": 0.6
      }
    ]
  },
  {
    "id": "madinah-ziyarah",
    "title": "Madinah Ziyarah",
    "durationSec": 45,
    "style": "normal",
    "ui": {
      "hidePanels": true,
      "hudMode": "minimal",
      "safeFrame": "16:9"
    },
    "layers": {},
    "post": {
      "bloom": 40,
      "sharpen": true,
      "detectionMode": "OFF"
    },
    "cameraPath": [
      {
        "lat": 24.462,
        "lon": 39.6112,
        "alt": 999,
        "heading": 0,
        "pitch": -26,
        "roll": 0,
        "duration": 4,
        "hold": 0.4
      },
      {
        "lat": 24.46396,
        "lon": 39.60599,
        "alt": 999,
        "heading": 45,
        "pitch": -26,
        "roll": 0,
        "duration": 2.3,
        "hold": 0.6
      },
      {
        "lat": 24.4687,
        "lon": 39.60384,
        "alt": 999,
        "heading": 90,
        "pitch": -26,
        "roll": 0,
        "duration": 2.3,
        "hold": 0.6
      },
      {
        "lat": 24.4667,
        "lon": 39.62232,
        "alt": 907,
        "heading": 270,
        "pitch": -26,
        "roll": 0,
        "duration": 4,
        "hold": 4
      },
      {
        "lat": 24.4362,
        "lon": 39.62101,
        "alt": 867,
        "heading": 315,
        "pitch": -26,
        "roll": 0,
        "duration": 4,
        "hold": 5
      },
      {
        "lat": 24.4842,
        "lon": 39.57393,
        "alt": 865,
        "heading": 90,
        "pitch": -26,
        "roll": 0,
        "duration": 4,
        "hold": 4
      },
      {
        "lat": 24.47637,
        "lon": 39.6183,
        "alt": 5556,
        "heading": 0,
        "pitch": -42,
        "roll": 0,
        "duration": 4,
        "hold": 0.4
      },
      {
        "lat": 24.48994,
        "lon": 39.58229,
        "alt": 5556,
        "heading": 45,
        "pitch": -42,
        "roll": 0,
        "duration": 2,
        "hold": 0.6
      },
      {
        "lat": 24.5227,
        "lon": 39.56738,
        "alt": 5556,
        "heading": 90,
        "pitch": -42,
        "roll": 0,
        "duration": 2,
        "hold": 0.6
      }
    ]
  }
]);
