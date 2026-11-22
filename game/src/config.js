// config.js — constants, palette and city data for SOLARA HEAT.
// Everything here is original: the city of Solara Coast, its districts,
// its people and its story are invented for this game.
(function (global) {
  'use strict';
  const CFG = {
    WORLD_W: 2600,
    WORLD_H: 1900,
    VIEW_W: 1280,
    VIEW_H: 720,
    ROAD_W: 64,
    BLOCK: 320,
    SAVE_KEY: 'solara-heat-save-v1',
    COLORS: {
      grass: '#7fae5a', grass2: '#8fbf68', road: '#3a3f4a', roadLine: '#e8d44d',
      sidewalk: '#b9b3a4', sand: '#ecd9a0', sea: '#2e7fb8', seaDeep: '#1f5f92',
      building: ['#c96f4a', '#d9a05b', '#7a9cc6', '#b56576', '#e07a5f', '#6d9c7a', '#a87fb5', '#5b8c8a'],
      roof: ['#8a4b32', '#a67c3d', '#4a6a8a', '#7a3d4d']
    },
    DISTRICTS: [
      { name: 'Marina', x: 1700, y: 200, w: 900, h: 500 },
      { name: 'Old Town', x: 100, y: 200, w: 700, h: 500 },
      { name: 'Downtown', x: 900, y: 700, w: 800, h: 500 },
      { name: 'Beachfront', x: 100, y: 1300, w: 2400, h: 350 }
    ],
    RANKS: ['Rookie', 'Street', 'Crew', 'Lieutenant', 'King of Solara'],
    CAR_COLORS: ['#d94f3d', '#3d7dd9', '#e8c33d', '#e8e8e8', '#2b2b2b', '#4fae62', '#c65aad', '#e07a2f']
  };
  // Seeded RNG so the city is the same every run (deterministic world).
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  global.SolaraConfig = CFG;
  global.solaraRng = mulberry32;
})(window);
