// world.js — Solara Coast city generation, roads, buildings, collision.
// The city is a road grid: vertical and horizontal roads every BLOCK px,
// blocks between them filled with deterministic buildings, a park, a marina
// and a beach along the south edge.
(function (global) {
  'use strict';
  const CFG = global.SolaraConfig;
  const rng = global.solaraRng(20261122);

  const roadsV = []; // x centres
  const roadsH = []; // y centres
  for (let x = 200; x < CFG.WORLD_W; x += CFG.BLOCK) roadsV.push(x);
  for (let y = 200; y < CFG.WORLD_H - 200; y += CFG.BLOCK) roadsH.push(y);

  function onRoad(x, y) {
    for (const rx of roadsV) if (Math.abs(x - rx) < CFG.ROAD_W / 2 + 6) return true;
    for (const ry of roadsH) if (Math.abs(y - ry) < CFG.ROAD_W / 2 + 6) return true;
    return false;
  }
  function onSidewalk(x, y) {
    for (const rx of roadsV) if (Math.abs(x - rx) < CFG.ROAD_W / 2 + 22) return true;
    for (const ry of roadsH) if (Math.abs(y - ry) < CFG.ROAD_W / 2 + 22) return true;
    return false;
  }

  // Buildings: one or two per block, never on roads, never on the beach.
  const buildings = [];
  const park = { x: 900, y: 200, w: 620, h: 420 };
  for (let bx = 0; bx < roadsV.length - 1; bx++) {
    for (let by = 0; by < roadsH.length - 1; by++) {
      const x0 = roadsV[bx] + CFG.ROAD_W / 2 + 24;
      const y0 = roadsH[by] + CFG.ROAD_W / 2 + 24;
      const x1 = roadsV[bx + 1] - CFG.ROAD_W / 2 - 24;
      const y1 = roadsH[by + 1] - CFG.ROAD_W / 2 - 24;
      if (x0 >= x1 || y0 >= y1) continue;
      // Park block stays green.
      if (x0 >= park.x - 40 && y0 >= park.y - 40 && x1 <= park.x + park.w + 40 && y1 <= park.y + park.h + 40) continue;
      const n = 2;
      for (let i = 0; i < n; i++) {
        const w = 60 + rng() * 70, h = 50 + rng() * 70;
        const bx0 = x0 + (i === 0 ? 4 : (x1 - x0) / 2 + 4);
        const by0 = y0 + 6 + rng() * 14;
        if (bx0 + w > x1 || by0 + h > y1) continue;
        buildings.push({
          x: bx0, y: by0, w, h,
          color: CFG.COLORS.building[Math.floor(rng() * CFG.COLORS.building.length)],
          roof: CFG.COLORS.roof[Math.floor(rng() * CFG.COLORS.roof.length)],
          hgt: 14 + Math.floor(rng() * 26)
        });
      }
    }
  }

  // ---- landmarks: invented businesses get neon signs ----
  // Each sign hangs on the building nearest its anchor spot.
  const SIGN_ANCHORS = [
    { sign: 0, x: 2100, y: 400 },   // SOLARA HOTEL — Marina
    { sign: 1, x: 1250, y: 1520 },  // BEACH CAFE — Beachfront
    { sign: 2, x: 820, y: 840 },    // TACO SOL — Downtown
    { sign: 3, x: 1460, y: 1160 },  // NEON PALMS — Downtown
    { sign: 4, x: 1780, y: 520 },   // MARINA MOTORS — Marina
    { sign: 5, x: 2050, y: 520 }    // SOLARA GARAGE — Marina garage
  ];
  const landmarks = {};
  for (const a of SIGN_ANCHORS) {
    let best = null, bd = 1e9;
    for (const b of buildings) {
      const d = Math.hypot(b.x + b.w / 2 - a.x, b.y + b.h / 2 - a.y);
      if (d < bd) { bd = d; best = b; }
    }
    if (best) { best.sign = a.sign; landmarks[a.sign] = best; }
  }
  const garageBuilding = landmarks[5] || null;

  // Palm-lined beachfront boulevard (road y=1480), palms on both sidewalks.
  const palms = [];
  for (let x = 260; x < 2500; x += 170) {
    for (const off of [-64, 64]) {
      const tz = 1480 + off;
      if (!onRoad(x, tz) && !hitBuilding(x, tz, 20)) palms.push({ x, y: tz, h: 30 + rng() * 14 });
    }
  }
  // Street lamps along the main roads.
  const lamps = [];
  for (const rx of roadsV) for (const ry of roadsH) {
    if (rx > 200 && ry > 200) lamps.push({ x: rx + 44, y: ry - 44 });
  }
  // Traffic lights at every city intersection (cycle with game time).
  const trafficLights = [];
  for (const rx of roadsV) for (const ry of roadsH) trafficLights.push({ x: rx, y: ry });
  // Beach umbrellas on the sand.
  const umbrellas = [];
  for (let x = 320; x < 2500; x += 240) umbrellas.push({ x, y: 1710 + (rng() < 0.5 ? 0 : 40), color: ['#ff6f61', '#ffd94d', '#7fd4ff', '#ff6fd8'][Math.floor(rng() * 4)] });

  function hitBuilding(x, y, r) {
    for (const b of buildings) {
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
    }
    return null;
  }
  function clampWorld(x, y, r) {
    return {
      x: Math.max(r, Math.min(CFG.WORLD_W - r, x)),
      y: Math.max(r, Math.min(CFG.WORLD_H - r, y))
    };
  }
  // Nearest road centre for AI driving.
  function nearestRoadPoint(x, y) {
    let best = null, bd = 1e9;
    for (const rx of roadsV) for (const ry of roadsH) {
      const d = Math.abs(x - rx) + Math.abs(y - ry);
      if (d < bd) { bd = d; best = { x: rx, y: ry }; }
    }
    return best;
  }
  function districtAt(x, y) {
    for (const d of CFG.DISTRICTS) if (x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h) return d.name;
    return 'Solara Coast';
  }
  global.SolaraWorld = {
    roadsV, roadsH, buildings, park, onRoad, onSidewalk,
    hitBuilding, clampWorld, nearestRoadPoint, districtAt,
    landmarks, garageBuilding, palms, lamps, trafficLights, umbrellas,
    beachY: 1650, seaY: 1780
  };
})(window);
