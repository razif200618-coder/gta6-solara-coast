// entities.js — traffic cars and pedestrians of Solara Coast.
// Traffic follows the road grid, turns at intersections, slows for cars
// ahead. Pedestrians walk the sidewalks and flee from danger.
(function (global) {
  'use strict';
  const W = global.SolaraWorld, CFG = global.SolaraConfig;
  const rng = global.solaraRng(777);
  function makeCar(x, y, angle, color, isTraffic) {
    return { x, y, angle, speed: 0, color: color || CFG.CAR_COLORS[Math.floor(rng() * CFG.CAR_COLORS.length)], w: 34, h: 18, traffic: !!isTraffic, maxSpeed: 70 + rng() * 40, targetSpeed: 70, turnCooldown: 0 };
  }
  function spawnTraffic(n) {
    const cars = [];
    for (let i = 0; i < n; i++) {
      const rx = W.roadsV[Math.floor(rng() * W.roadsV.length)];
      const ry = W.roadsH[Math.floor(rng() * W.roadsH.length)];
      const horizontal = rng() < 0.5;
      cars.push(makeCar(rx + (horizontal ? (rng() - 0.5) * 200 : (rng() < 0.5 ? -14 : 14)),
        ry + (horizontal ? (rng() < 0.5 ? -14 : 14) : (rng() - 0.5) * 200),
        horizontal ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2), null, true));
    }
    return cars;
  }
  function updateTraffic(cars, dt, playerCar) {
    for (const c of cars) {
      c.turnCooldown -= dt;
      // At an intersection, sometimes turn.
      const nearX = W.roadsV.some(rx => Math.abs(c.x - rx) < 8);
      const nearY = W.roadsH.some(ry => Math.abs(c.y - ry) < 8);
      if (nearX && nearY && c.turnCooldown <= 0 && rng() < 0.01) {
        c.angle += (rng() < 0.5 ? 1 : -1) * Math.PI / 2;
        c.turnCooldown = 2;
      }
      // Slow for a car ahead.
      let ahead = false;
      for (const o of cars) {
        if (o === c) continue;
        const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy);
        if (d < 46 && d > 1 && Math.cos(Math.atan2(dy, dx) - c.angle) > 0.7) { ahead = true; break; }
      }
      const target = ahead ? 0 : c.maxSpeed;
      c.speed += (target - c.speed) * Math.min(1, dt * 1.5);
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;
      // Wrap around the world edges on roads.
      if (c.x < 40) c.x = CFG.WORLD_W - 40; if (c.x > CFG.WORLD_W - 40) c.x = 40;
      if (c.y < 40) c.y = CFG.WORLD_H - 40; if (c.y > CFG.WORLD_H - 40) c.y = 40;
    }
  }
  function spawnPeds(n) {
    const peds = [];
    const names = ['Mara', 'Tomas', 'Lia', 'Kiko', 'Ana', 'Rudi', 'Sinta', 'Bimo'];
    for (let i = 0; i < n; i++) {
      const rx = W.roadsV[Math.floor(rng() * W.roadsV.length)];
      const ry = W.roadsH[Math.floor(rng() * W.roadsH.length)];
      peds.push({ x: rx + (rng() - 0.5) * 120, y: ry + (rng() - 0.5) * 120, angle: rng() * Math.PI * 2, speed: 22 + rng() * 18, name: names[i % names.length], flee: 0, color: ['#e07a5f', '#3d7dd9', '#4fae62', '#c65aad', '#e8c33d'][i % 5] });
    }
    return peds;
  }
  function updatePeds(peds, dt, danger) {
    for (const p of peds) {
      let run = false;
      if (danger) {
        const d = Math.hypot(p.x - danger.x, p.y - danger.y);
        if (d < 160) { p.flee = 1.2; run = true; p.angle = Math.atan2(p.y - danger.y, p.x - danger.x); }
      }
      if (p.flee > 0) p.flee -= dt;
      if (rng() < 0.004) p.angle += (rng() - 0.5) * 2;
      const sp = run || p.flee > 0 ? p.speed * 2.6 : p.speed;
      let nx = p.x + Math.cos(p.angle) * sp * dt, ny = p.y + Math.sin(p.angle) * sp * dt;
      if (W.hitBuilding(nx, ny, 8)) { p.angle += Math.PI / 2; nx = p.x; ny = p.y; }
      const c = W.clampWorld(nx, ny, 10); p.x = c.x; p.y = c.y;
    }
  }
  global.SolaraEntities = { makeCar, spawnTraffic, updateTraffic, spawnPeds, updatePeds };
})(window);
