// police.js — wanted level, police chases, roadblocks and the helicopter.
// Wanted 1-2: patrol cars chase. 3: roadblocks appear. 4+: the CONDOR
// helicopter circles with a searchlight. Evade the police to cool down.
(function (global) {
  'use strict';
  const W = global.SolaraWorld;
  const rng = global.solaraRng(4242);
  function makePolice() {
    return { wanted: 0, heat: 0, cars: [], heli: null, roadblocks: [], bustedTimer: 0, evadeTimer: 0 };
  }
  function addWanted(pol, n, game) {
    pol.wanted = Math.max(0, Math.min(5, pol.wanted + n));
    pol.heat = 1; pol.evadeTimer = 0;
    if (pol.wanted >= 3 && pol.roadblocks.length === 0) {
      const p = game.player;
      for (let i = 0; i < 2; i++) {
        const rx = W.roadsV[Math.floor(rng() * W.roadsV.length)];
        pol.roadblocks.push({ x: rx, y: Math.max(120, Math.min(1700, p.y + (i ? 260 : -260))) });
      }
    }
    if (pol.wanted >= 4 && !pol.heli) pol.heli = { angle: 0, x: game.player.x, y: game.player.y - 200 };
  }
  function updatePolice(pol, dt, game) {
    const p = game.player;
    if (pol.wanted <= 0) { pol.cars = []; pol.roadblocks = []; pol.heli = null; return; }
    // Spawn / keep chasers.
    const want = Math.min(3, pol.wanted);
    while (pol.cars.length < want) {
      const a = rng() * Math.PI * 2;
      pol.cars.push({ x: p.x + Math.cos(a) * 500, y: p.y + Math.sin(a) * 500, angle: a, speed: 0, color: '#1c2f4a' });
    }
    pol.cars = pol.cars.slice(0, want);
    let nearest = 1e9;
    for (const c of pol.cars) {
      const target = Math.atan2(p.y - c.y, p.x - c.x);
      let diff = target - c.angle;
      while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
      c.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      c.speed = Math.min(300 + pol.wanted * 12, c.speed + 180 * dt);
      const nx = c.x + Math.cos(c.angle) * c.speed * dt;
      const ny = c.y + Math.sin(c.angle) * c.speed * dt;
      if (W.hitBuilding(nx, ny, 18)) { c.angle += Math.PI / 2; c.speed *= 0.5; } // don't drive through buildings
      else { c.x = nx; c.y = ny; }
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      nearest = Math.min(nearest, d);
      if (d < 26) {
        if (p.onFoot) { pol.bustedTimer += dt; if (pol.bustedTimer > 1.2) game.onBusted && game.onBusted(); }
        else { c.speed *= 0.4; p.car.speed *= 0.55; game.onCrash && game.onCrash(); }
      }
    }
    if (nearest > 420) { pol.evadeTimer += dt; if (pol.evadeTimer > 18) { pol.wanted = Math.max(0, pol.wanted - 1); pol.evadeTimer = 0; if (pol.wanted < 3) pol.roadblocks = []; if (pol.wanted < 4) pol.heli = null; } }
    else pol.evadeTimer = 0;
    if (pol.heli) { pol.heli.angle += dt * 0.7; pol.heli.x = p.x + Math.cos(pol.heli.angle) * 160; pol.heli.y = p.y + Math.sin(pol.heli.angle) * 160 - 60; }
    if (pol.wanted > 0) pol.heat = Math.min(1, pol.heat + dt * 0.1);
  }
  global.SolaraPolice = { makePolice, addWanted, updatePolice };
})(window);
