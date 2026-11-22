// hud.js — HUD and minimap. Cash, respect rank + progress, wanted stars,
// mission objective, speed, district + district standing, weapon slot,
// radio station, and a live minimap of Solara Coast.
(function (global) {
  'use strict';
  const W = global.SolaraWorld, CFG = global.SolaraConfig;
  function rankName(respect) {
    const i = Math.min(CFG.RANKS.length - 1, Math.floor(respect / 25));
    return CFG.RANKS[i];
  }
  function rankProgress(respect) {
    const i = Math.min(CFG.RANKS.length - 1, Math.floor(respect / 25));
    if (i >= CFG.RANKS.length - 1) return 1;
    return (respect - i * 25) / 25;
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
    // Garage marker (wrench square) + race start marker.
    ctx.fillStyle = '#7fd4ff'; ctx.fillRect(CFG.GARAGE.x * sx - 3, CFG.GARAGE.y * sy - 3, 6, 6);
    ctx.fillStyle = '#ff8c42'; ctx.fillRect(CFG.RACE_START.x * sx - 3, CFG.RACE_START.y * sy - 3, 6, 6);
    const tgt = game.missionTarget || (game.race && game.race.active ? global.SolaraActivities.raceTarget(game) : null);
    if (tgt) { ctx.fillStyle = '#ffd94d'; ctx.beginPath(); ctx.arc(tgt.x * sx, tgt.y * sy, 5, 0, Math.PI * 2); ctx.fill(); }
    for (const c of game.police.cars) { ctx.fillStyle = '#4d9fff'; ctx.fillRect(c.x * sx - 2, c.y * sy - 2, 4, 4); }
    if (game.race && game.race.active) {
      for (const rv of game.race.rivals) { ctx.fillStyle = '#ff8c42'; ctx.fillRect(rv.x * sx - 2, rv.y * sy - 2, 4, 4); }
    }
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
    // Rank progress bar.
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(290, 34, 130, 4);
    ctx.fillStyle = '#ffd94d'; ctx.fillRect(290, 34, 130 * rankProgress(p.respect), 4);
    const district = W.districtAt(p.x, p.y);
    ctx.fillStyle = '#fff';
    ctx.fillText(district, 560, 28);
    // Wanted stars.
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < game.police.wanted ? '#ffd94d' : 'rgba(255,255,255,0.25)';
      ctx.font = '20px sans-serif'; ctx.fillText('★', 760 + i * 24, 30);
    }
    if (!p.onFoot && p.car) { ctx.fillStyle = '#fff'; ctx.font = '15px sans-serif'; ctx.fillText(Math.round(Math.abs(p.car.speed) * 0.9) + ' km/h', 900, 28); }
    // Weapon slot (bottom-left, above the controls hint).
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(16, CFG.VIEW_H - 78, 250, 34);
    ctx.fillStyle = p.weapon === 'fists' ? '#ffd94d' : '#fff'; ctx.font = 'bold 14px sans-serif';
    ctx.fillText('[1] FISTS', 26, CFG.VIEW_H - 56);
    ctx.fillStyle = p.weapon === 'pistol' ? '#ffd94d' : '#fff';
    ctx.fillText('[2] PISTOL ' + (p.ammo || 0), 120, CFG.VIEW_H - 56);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '12px sans-serif';
    ctx.fillText('F shoot', 218, CFG.VIEW_H - 56);
    // Radio station (bottom-right, above minimap area is taken — put it left of minimap).
    if (!p.onFoot && p.car) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(CFG.VIEW_W - 216, 200, 200, 26);
      ctx.fillStyle = '#7fd4ff'; ctx.font = 'bold 13px sans-serif';
      ctx.fillText('♪ ' + global.SolaraAudio.stationName() + '  [V]', CFG.VIEW_W - 204, 218);
    }
    // Mission objective.
    const m = game.missions.active;
    ctx.textAlign = 'left';
    if (m) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(16, 58, 560, 52);
      ctx.fillStyle = '#ffd94d'; ctx.font = 'bold 15px sans-serif';
      ctx.fillText('MISSION: ' + m.title + (game.missions.timer > 0 ? '  ⏱ ' + Math.ceil(game.missions.timer) + 's' : ''), 28, 78);
      ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif';
      ctx.fillText(m.brief.slice(0, 70), 28, 98);
    } else if (game.race && game.race.active) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(16, 58, 560, 52);
      ctx.fillStyle = '#ff8c42'; ctx.font = 'bold 15px sans-serif';
      ctx.fillText('STREET RACE  ⏱ ' + Math.ceil(game.race.timer) + 's  •  checkpoint ' + (game.race.step + 1) + '/' + game.race.active.checkpoints.length, 28, 78);
      ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif';
      ctx.fillText('Beat the rivals through the checkpoints — $150 if you win.', 28, 98);
    } else if (game.missions.message) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(16, 58, 560, 30);
      ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif';
      ctx.fillText(game.missions.message.slice(0, 80), 28, 78);
    }
    // District standing under the mission box.
    const st = global.SolaraActivities.standingTier(game, district);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(16, 116, 300, 22);
    ctx.fillStyle = '#ffd94d'; ctx.font = '13px sans-serif';
    ctx.fillText(district + ' standing: ' + st.value + ' — ' + st.tier, 26, 132);
    // Garage / race prompts.
    if (game.nearGarage) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(440, 300, 400, 110);
      ctx.fillStyle = '#7fd4ff'; ctx.font = 'bold 17px sans-serif';
      ctx.fillText('SOLARA GARAGE — press G', 460, 326);
      ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif';
      ctx.fillText('1 Repair $50   2 Engine +speed $200', 460, 352);
      ctx.fillText('3 Armor $150   4 Repaint $40', 460, 374);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '12px sans-serif';
      ctx.fillText('Car HP: ' + Math.round(p.car ? p.car.hp : 0) + '/100', 460, 396);
    }
    if (game.state === 'garage') {
      ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
      ctx.fillStyle = '#7fd4ff'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('SOLARA GARAGE', 640, 240);
      ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif';
      ctx.fillText('Cash: $' + p.cash + '   •   Car HP: ' + Math.round(p.car ? p.car.hp : 0) + '/100   •   Engine Lv ' + (p.car ? p.car.upgrades.engine : 0) + '   •   Armor Lv ' + (p.car ? p.car.upgrades.armor : 0), 640, 290);
      ctx.font = '17px sans-serif';
      ctx.fillText('[1] Repair $50      [2] Engine tune $200      [3] Armor $150      [4] Repaint $40', 640, 340);
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '15px sans-serif';
      ctx.fillText('Press G or Esc to leave the garage', 640, 390);
      ctx.textAlign = 'left';
    }
    if (game.nearRaceStart && !(game.race && game.race.active)) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(440, 330, 400, 44);
      ctx.fillStyle = '#ff8c42'; ctx.font = 'bold 15px sans-serif';
      ctx.fillText('STREET RACE — press T to start ($150)', 460, 358);
    }
    // Car HP bar when driving.
    if (!p.onFoot && p.car) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(16, CFG.VIEW_H - 108, 180, 18);
      ctx.fillStyle = p.car.hp > 40 ? '#4fae62' : '#ff5a4d';
      ctx.fillRect(18, CFG.VIEW_H - 106, 176 * Math.max(0, p.car.hp / 100), 14);
      ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
      ctx.fillText('CAR ' + Math.round(p.car.hp) + '%', 24, CFG.VIEW_H - 95);
    }
    // Waypoint arrow at screen edge, relative to the camera heading.
    const tgt = game.missionTarget || (game.race && game.race.active ? global.SolaraActivities.raceTarget(game) : null);
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
    ctx.fillText('WASD move/drive • E enter car • Space punch/handbrake • F shoot • 1/2 weapon • V radio • G garage • T race • M mission • P pause • R reset • Q orbit', 16, CFG.VIEW_H - 12);
  }
  global.SolaraHUD = { drawHUD, drawMinimap, rankName };
})(window);
