// render.js — draws Solara Coast: sun-soaked streets, beach, park, marina,
// buildings with height shadows, cars, people, police, helicopter, effects.
(function (global) {
  'use strict';
  const W = global.SolaraWorld, CFG = global.SolaraConfig;
  function drawCar(ctx, x, y, angle, color, isPolice) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-19, -11, 38, 24);
    ctx.fillStyle = color; ctx.fillRect(-18, -10, 36, 20);
    ctx.fillStyle = isPolice ? '#dfe8f2' : '#222831'; ctx.fillRect(-6, -8, 14, 16);
    ctx.fillStyle = '#ffd94d'; ctx.fillRect(16, -8, 2, 4); ctx.fillRect(16, 4, 2, 4);
    ctx.fillStyle = '#ff5a4d'; ctx.fillRect(-18, -8, 2, 4); ctx.fillRect(-18, 4, 2, 4);
    if (isPolice) { ctx.fillStyle = '#ff3b30'; ctx.fillRect(-2, -11, 6, 3); ctx.fillStyle = '#3b82ff'; ctx.fillRect(4, -11, 6, 3); }
    ctx.restore();
  }
  function drawWorld(ctx, game, cam) {
    const C = CFG.COLORS;
    // Ground.
    ctx.fillStyle = C.grass; ctx.fillRect(cam.x, cam.y, CFG.VIEW_W, CFG.VIEW_H);
    // Park.
    ctx.fillStyle = C.grass2; ctx.fillRect(W.park.x - cam.x, W.park.y - cam.y, W.park.w, W.park.h);
    ctx.fillStyle = '#5d9c4a';
    for (let i = 0; i < 8; i++) { const tx = W.park.x + 60 + i * 70, ty = W.park.y + 60 + (i % 3) * 110; ctx.beginPath(); ctx.arc(tx - cam.x, ty - cam.y, 22, 0, Math.PI * 2); ctx.fill(); }
    // Beach + sea (south edge).
    ctx.fillStyle = C.sand; ctx.fillRect(0, W.beachY - cam.y, CFG.WORLD_W, W.seaY - W.beachY);
    ctx.fillStyle = C.sea; ctx.fillRect(0, W.seaY - cam.y, CFG.WORLD_W, CFG.WORLD_H - W.seaY);
    ctx.fillStyle = C.seaDeep; for (let i = 0; i < 12; i++) ctx.fillRect((i * 230) - cam.x, W.seaY + 30 + (i % 3) * 24 - cam.y, 120, 4);
    // Roads.
    ctx.fillStyle = C.road;
    for (const rx of W.roadsV) ctx.fillRect(rx - CFG.ROAD_W / 2 - cam.x, 0, CFG.ROAD_W, CFG.WORLD_H);
    for (const ry of W.roadsH) ctx.fillRect(0, ry - CFG.ROAD_W / 2 - cam.y, CFG.WORLD_W, CFG.ROAD_W);
    // Sidewalks.
    ctx.fillStyle = C.sidewalk;
    for (const rx of W.roadsV) { ctx.fillRect(rx - CFG.ROAD_W / 2 - 10 - cam.x, 0, 8, CFG.WORLD_H); ctx.fillRect(rx + CFG.ROAD_W / 2 + 2 - cam.x, 0, 8, CFG.WORLD_H); }
    // Centre dashes.
    ctx.fillStyle = C.roadLine;
    for (const rx of W.roadsV) for (let y = 0; y < CFG.WORLD_H; y += 56) ctx.fillRect(rx - 2 - cam.x, y - cam.y, 4, 28);
    for (const ry of W.roadsH) for (let x = 0; x < CFG.WORLD_W; x += 56) ctx.fillRect(x - cam.x, ry - 2 - cam.y, 28, 4);
    // Buildings with height shadow.
    for (const b of W.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(b.x + 8 - cam.x, b.y + 8 - cam.y, b.w, b.h);
      ctx.fillStyle = b.color; ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
      ctx.fillStyle = b.roof; ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      for (let wx = b.x + 10; wx < b.x + b.w - 14; wx += 22) for (let wy = b.y + 18; wy < b.y + b.h - 12; wy += 24) ctx.fillRect(wx - cam.x, wy - cam.y, 10, 12);
    }
    // Roadblocks.
    for (const rb of game.police.roadblocks) {
      ctx.fillStyle = '#ff7a1a'; ctx.fillRect(rb.x - 30 - cam.x, rb.y - 8 - cam.y, 60, 16);
      ctx.fillStyle = '#fff'; ctx.fillRect(rb.x - 30 - cam.x, rb.y - 8 - cam.y, 60, 4);
    }
    // Mission target marker.
    const tgt = game.missionTarget;
    if (tgt) {
      const pulse = 1 + Math.sin(game.time * 4) * 0.15;
      ctx.strokeStyle = '#ffd94d'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(tgt.x - cam.x, tgt.y - cam.y, 26 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffd94d'; ctx.beginPath(); ctx.moveTo(tgt.x - cam.x, tgt.y - 34 - cam.y); ctx.lineTo(tgt.x + 8 - cam.x, tgt.y - 18 - cam.y); ctx.lineTo(tgt.x - 8 - cam.x, tgt.y - 18 - cam.y); ctx.fill();
    }
    // Traffic + parked cars.
    for (const c of game.traffic) drawCar(ctx, c.x - cam.x, c.y - cam.y, c.angle, c.color, false);
    for (const c of game.parked) drawCar(ctx, c.x - cam.x, c.y - cam.y, c.angle, c.color, false);
    // Police cars.
    for (const c of game.police.cars) drawCar(ctx, c.x - cam.x, c.y - cam.y, c.angle, c.color, true);
    // Pedestrians.
    for (const p of game.peds) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(p.x - cam.x, p.y + 4 - cam.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f2c89b'; ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - 2 - cam.y, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // Player.
    const pl = game.player;
    if (!pl.onFoot) { const car = pl.car; if (car) drawCar(ctx, car.x - cam.x, car.y - cam.y, car.angle, car.color, false); }
    else {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(pl.x - cam.x, pl.y + 7 - cam.y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = pl.color; ctx.beginPath(); ctx.arc(pl.x - cam.x, pl.y - cam.y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(pl.x - cam.x, pl.y - cam.y, 13, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#f2c89b'; ctx.beginPath(); ctx.arc(pl.x - cam.x, pl.y - 3 - cam.y, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd94d'; ctx.beginPath(); ctx.arc(pl.x + Math.cos(pl.angle) * 16 - cam.x, pl.y + Math.sin(pl.angle) * 16 - cam.y, 3, 0, Math.PI * 2); ctx.fill();
      if (pl.punchTimer > 0.25) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(pl.x - cam.x, pl.y - cam.y, 20, pl.angle - 0.6, pl.angle + 0.6); ctx.stroke(); }
    }
    // Helicopter shadow + searchlight.
    if (game.police.heli) {
      const h = game.police.heli;
      ctx.fillStyle = 'rgba(255,255,180,0.18)'; ctx.beginPath(); ctx.arc(h.x - cam.x, h.y + 40 - cam.y, 90, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(h.x - cam.x, h.y - cam.y, 26, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#222'; ctx.fillRect(h.x - 14 - cam.x, h.y - 4 - cam.y, 28, 8);
    }
    // Sun glare (top-left, warm).
    const g = ctx.createRadialGradient(120, 60, 10, 120, 60, 260);
    g.addColorStop(0, 'rgba(255,240,180,0.35)'); g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 320, 220);
  }
  global.SolaraRender = { drawWorld, drawCar };
})(window);
