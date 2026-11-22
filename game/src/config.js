// config.js — SOLARA HEAT: constants, districts, ranks, prices, missions data.
// All names are original inventions for the city of Solara Coast.
(function (root) {
  var S = root.Solara || (root.Solara = {});
  S.CONFIG = {
    title: 'SOLARA HEAT',
    city: 'Solara Coast',
    worldSize: 420,          // playable square, metres
    roadSpacing: 60,
    roadWidth: 12,
    seaX: -210,              // sea lies west of x = -180
    beachX: -180,
    maxTraffic: 22,
    maxPeds: 40,
    maxWanted: 5,
    saveKey: 'solara-heat-save-v1',
    garage: { repair: 50, tune: 200, armor: 150, repaint: 40 },
    raceReward: { cash: 150, respect: 8 },
    ranks: [
      { name: 'Rookie', respect: 0 },
      { name: 'Hustler', respect: 30 },
      { name: 'Wheelman', respect: 70 },
      { name: 'Street Boss', respect: 130 },
      { name: 'Heat Legend', respect: 210 },
      { name: 'King of Solara', respect: 320 }
    ],
    radio: ['SOLARA FM', 'HEAT FM', 'PALM RADIO'],
    districts: [
      { name: 'Beachfront', x0: -210, z0: -210, x1: -120, z1: 210, color: '#e8c98a' },
      { name: 'Downtown', x0: -120, z0: -110, x1: 60, z1: 110, color: '#8a9ab8' },
      { name: 'Marina', x0: -120, z0: 110, x1: 60, z1: 210, color: '#7fb8a8' },
      { name: 'Palms Park', x0: 60, z0: -110, x1: 210, z1: 60, color: '#7fb86a' },
      { name: 'Northside', x0: 60, z0: 60, x1: 210, z1: 210, color: '#b8a88a' }
    ],
    neonSigns: ['SOLARA HOTEL', 'BEACH CAFE', 'TACO SOL', 'NEON PALMS', 'MARINA MOTORS', 'SOLARA GARAGE', 'PIER 9', 'SUNSET DINER', 'CORAL BAR', 'WAVE WASH']
  };
  // Fresh game state factory — every field the HUD, save/load and tests use.
  S.newState = function () {
    return {
      cash: 250, respect: 0, wanted: 0, heat: 0,
      ammo: 24, weapon: 'fists', carHp: 100, playerHp: 100,
      missionIndex: 0, missionsDone: 0, racesWon: 0, carsStolen: 0,
      garage: { tune: 0, armor: 0, color: 0 },
      radio: 0, muted: false, busted: false, paused: false,
      started: false, playTime: 0,
      player: { x: -40, z: 40, angle: 0, speed: 0, inCar: false, carId: null },
      car: null, // active car object when driving
      mission: null, race: null, roadblock: false, helicopter: false
    };
  };
  S.state = S.newState();
  // Rank from respect points.
  S.rankFor = function (respect) {
    var r = S.CONFIG.ranks[0];
    for (var i = 0; i < S.CONFIG.ranks.length; i++) {
      if (respect >= S.CONFIG.ranks[i].respect) r = S.CONFIG.ranks[i];
    }
    return r;
  };
  S.nextRank = function (respect) {
    for (var i = 0; i < S.CONFIG.ranks.length; i++) {
      if (respect < S.CONFIG.ranks[i].respect) return S.CONFIG.ranks[i];
    }
    return null;
  };
  S.districtAt = function (x, z) {
    var d = S.CONFIG.districts;
    for (var i = 0; i < d.length; i++) {
      if (x >= d[i].x0 && x < d[i].x1 && z >= d[i].z0 && z < d[i].z1) return d[i].name;
    }
    return 'Solara Coast';
  };
  // Deterministic seeded RNG so the city layout is stable run to run.
  S.rng = function (seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };
  S.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  S.dist2d = function (ax, az, bx, bz) {
    var dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz);
  };
})(typeof window !== 'undefined' ? window : globalThis);
