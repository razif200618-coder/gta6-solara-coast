// hud.js — HUD and minimap. Cash, respect rank, wanted stars, mission
// objective, speed, district, and a live minimap of Solara Coast.
(function (global) {
  'use strict';
  const W = global.SolaraWorld, CFG = global.SolaraConfig;
  function rankName(respect) {
    const i = Math.min(CFG.RANKS.length - 1, Math.floor(respect / 25));
    return CFG.RANKS[i];
  }
  function drawMinimap(ctx, game, x, y, w, h) {
    const sx = w / CFG.WORLD_W, sy = h / CFG.WORLD_H;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(10,20,16,0.78)'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#5a6a72'; ctx.lineWidth = 1;
    ctx.fillStyle = '#3a3f4a';
    for (const rx of W.roadsV) ctx.fillRect(rx * sx - 1, 0, 2, h);
    for (const ry of W.roadsH) ctx.fillRect(0, ry * sy - 1, w, 2);
    ctx.fillStyle = '#2e7fb8'; ctx.fillRect(0, W.seaY * sy, w, h - W.seaY * sy);
    const tgt = game.missionTarget;
    if (tgt) { ctx.fillStyle = '#ffd94d'; ctx.beginPath(); ctx.arc(tgt.x * sx, tgt.y * sy, 5, 0, Math.PI * 2); ctx.fill(); }
    for (const c of game.police.cars) { ctx.fillStyle = '#4d9fff'; ctx.fillRect(c.x * sx - 2, c.y * sy - 2, 4, 4); }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(game.player.x * sx, game.player.y * sy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd94d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(game.player.x * sx, game.player.y * sy, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    ctx.restore();
  }
  function drawHUD(ctx, game) {
    const p = game.player;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, CFG.VIEW_W, 46);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('SOLARA HEAT', 16, 29);
    ctx.font = '15px sans-serif';
    ctx.fillText('$' + p.cash, 190, 28);
    ctx.fillText(rankName(p.respect) + '  •  ' + p.respect + ' respect', 290, 28);
    ctx.fillText(W.districtAt(p.x, p.y), 560, 28);
    // Wanted stars.
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < game.police.wanted ? '#ffd94d' : 'rgba(255,255,255,0.25)';
      ctx.font = '20px sans-serif'; ctx.fillText('★', 760 + i * 24, 30);
    }
    if (!p.onFoot && p.car) { ctx.fillStyle = '#fff'; ctx.fillText(Math.round(Math.abs(p.car.speed) * 0.9) + ' km/h', 900, 28); }
    // Mission objective.
    const m = game.missions.active;
    ctx.textAlign = 'left';
    if (m) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(16, 58, 560, 52);
      ctx.fillStyle = '#ffd94d'; ctx.font = 'bold 15px sans-serif';
      ctx.fillText('MISSION: ' + m.title + (game.missions.timer > 0 ? '  ⏱ ' + Math.ceil(game.missions.timer) + 's' : ''), 28, 78);
      ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif';
      ctx.fillText(m.brief.slice(0, 70), 28, 98);
    } else if (game.missions.message) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(16, 58, 560, 30);
      ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif';
      ctx.fillText(game.missions.message.slice(0, 80), 28, 78);
    }
    // Waypoint arrow at screen edge, relative to the camera heading.
    const tgt = game.missionTarget;
    if (tgt) {
      const dx = tgt.x - p.x, dy = tgt.y - p.y, d = Math.hypot(dx, dy);
      if (d > 60) {
        const a = Math.atan2(dy, dx) - (game.camHeading || 0);
        const ex = 640 + Math.cos(a) * 300, ey = 360 + Math.sin(a) * 240;
        ctx.fillStyle = '#ffd94d'; ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.fill(); ctx.restore();
        ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(Math.round(d) + 'm', ex, ey + 26);
      }
    }
    drawMinimap(ctx, game, CFG.VIEW_W - 196, 58, 180, 132);
    // Controls hint.
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('WASD move/drive • E enter car • Space punch/handbrake • Shift run • M mission • P pause • R reset • Q orbit camera', 16, CFG.VIEW_H - 12);
  }
  global.SolaraHUD = { drawHUD, drawMinimap, rankName };
})(window);
