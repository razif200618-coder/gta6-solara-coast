// world.js — Solara Coast city generation: road grid, buildings with
// runtime canvas facades, palms, lamps, beach, sea, marina, park.
(function (root) {
  var S = root.Solara || (root.Solara = {});
  var W = S.World = { buildings: [], roads: [], palms: [], lamps: [], props: [], signs: [], stashes: [], cars: [], initialized: false };
  var CAR_COLORS = ['#c0392b', '#2980b9', '#f1c40f', '#ecf0f1', '#2c3e50', '#e67e22', '#8e44ad', '#16a085'];

  function facadeTexture(base, windows, sign) {
    if (typeof document === 'undefined') return null;
    var cv = document.createElement('canvas'); cv.width = 128; cv.height = 256;
    var g = cv.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 128, 256);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 128, 10);
    var lit = ['#ffe9a8', '#9fd8ff', '#ffd27f'];
    for (var r = 0; r < windows; r++) for (var c = 0; c < 4; c++) {
      g.fillStyle = (r * 7 + c * 3) % 5 === 0 ? lit[(r + c) % 3] : '#1d2b3a';
      g.fillRect(10 + c * 28, 24 + r * 34, 20, 24);
    }
    if (sign) {
      g.fillStyle = '#ff5e8a'; g.fillRect(0, 220, 128, 28);
      g.fillStyle = '#fff'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center';
      g.fillText(sign.slice(0, 12), 64, 239);
    }
    return S.Engine.createTexture(cv);
  }

  W.build = function () {
    if (W.initialized) return W;
    var rand = S.rng(20261122);
    var i, j;
    // Roads: grid every 60 m across the city.
    for (i = -180; i <= 180; i += 60) {
      W.roads.push({ x0: i - 6, z0: -210, x1: i + 6, z1: 210, vertical: true });
      W.roads.push({ x0: -210, z0: i - 6, x1: 210, z1: i + 6, vertical: false });
    }
    // Buildings: blocks between roads, skipped near beach/sea and park.
    var bases = ['#c9a06a', '#8fa3b8', '#b87f6a', '#7fa08a', '#a88fb8', '#d8b25e'];
    var signIdx = 0;
    for (i = -180; i <= 120; i += 60) {
      for (j = -180; j <= 120; j += 60) {
        if (i < -120) continue; // beachfront strip: palms + low cafes only
        if (i >= 60 && j >= -60 && j < 60) continue; // Palms Park
        if (rand() < 0.12) continue;
        var h = 10 + rand() * 34;
        var sign = (rand() < 0.3) ? S.CONFIG.neonSigns[signIdx++ % S.CONFIG.neonSigns.length] : null;
        var b = {
          x: i + 30 + (rand() - 0.5) * 6, z: j + 30 + (rand() - 0.5) * 6, w: 22 + rand() * 8,
          d: 22 + rand() * 8, h: h, color: bases[(i + j) % bases.length | 0] || bases[0],
          sign: sign, tex: null
        };
        b.tex = facadeTexture(b.color, Math.max(3, Math.floor(h / 8)), sign);
        W.buildings.push(b);
        // Rooftop props: AC units / antennas.
        W.props.push({ kind: 'ac', x: b.x - 6, y: b.h, z: b.z - 4 });
        if (rand() < 0.5) W.props.push({ kind: 'antenna', x: b.x + 7, y: b.h, z: b.z + 5 });
        if (sign) W.signs.push({ x: b.x, y: Math.min(b.h, 14), z: b.z + b.d / 2 + 0.4, text: sign });
      }
    }
    // Beachfront palms + umbrellas along the boulevard.
    for (i = -200; i <= 200; i += 18) {
      W.palms.push({ x: -132 + rand() * 6, z: i, h: 7 + rand() * 3 });
      if (rand() < 0.6) W.props.push({ kind: 'umbrella', x: -160 + rand() * 14, y: 0, z: i + 6, color: ['#ff5e8a', '#f1c40f', '#2ec4b6'][(((i / 18) | 0) % 3 + 3) % 3] });
    }
    // Park trees + lamps.
    for (i = 0; i < 26; i++) W.palms.push({ x: 80 + rand() * 110, z: -50 + rand() * 100, h: 6 + rand() * 3 });
    for (i = -180; i <= 180; i += 60) for (j = -180; j <= 180; j += 60) {
      W.lamps.push({ x: i + 8, z: j + 8 });
    }
    // Traffic lights at main intersections.
    W.lights = [];
    for (i = -120; i <= 120; i += 60) for (j = -120; j <= 120; j += 60) {
      W.lights.push({ x: i + 7, z: j + 7, phase: ((i + j) / 60) % 3 });
    }
    // Ammo stashes (green crates) around the city.
    var stashSpots = [[-40, 40], [30, -30], [-90, 120], [90, 90], [0, 150], [-150, -60], [150, -90], [60, 0]];
    stashSpots.forEach(function (p) { W.stashes.push({ x: p[0], z: p[1], taken: false }); });
    // Parked cars along roads.
    for (i = 0; i < 14; i++) {
      W.cars.push({
        id: 'park' + i, x: -150 + rand() * 300, z: -150 + rand() * 300,
        angle: (rand() * 4 | 0) * Math.PI / 2, color: CAR_COLORS[i % CAR_COLORS.length],
        parked: true, hp: 100, speed: 0
      });
    }
    W.initialized = true;
    return W;
  };
  W.carColors = CAR_COLORS;
  // Traffic-light state cycles green -> amber -> red.
  W.lightState = function (t, phase) {
    var c = Math.floor(t / 4 + phase) % 3;
    return c === 0 ? 'green' : c === 1 ? 'amber' : 'red';
  };
  W.isRoad = function (x, z) {
    for (var i = 0; i < W.roads.length; i++) {
      var r = W.roads[i];
      if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return true;
    }
    return false;
  };
})(typeof window !== 'undefined' ? window : globalThis);
