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
    beachY: 1650, seaY: 1780
  };
})(window);
