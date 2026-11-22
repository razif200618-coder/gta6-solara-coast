// activities.js — the Solara Garage and the repeatable street race.
// Garage: park at the Marina garage (2050, 520) and press G — repair the
// car, tune the engine, add armor, or repaint it, all for cash.
// Street race: press T at the Downtown race start (1140, 840) to run a
// repeatable race against two rival drivers for cash and respect.
// District standing: completing work in a district raises its standing.
(function (global) {
  'use strict';
  const CFG = global.SolaraConfig, W = global.SolaraWorld;
  const rng = global.solaraRng(31337);

  const GARAGE = CFG.GARAGE;
  const GARAGE_ITEMS = [
    { key: '1', name: 'Repair car (full HP)', cost: 50, can: s => (s.player.car ? s.player.car.hp < 100 : false), apply: s => { s.player.car.hp = 100; s.player.car.smoke = 0; } },
    { key: '2', name: 'Engine tune +speed', cost: 200, can: s => s.player.car && s.player.car.upgrades.engine < 3, apply: s => { s.player.car.upgrades.engine++; } },
    { key: '3', name: 'Armor plating', cost: 150, can: s => s.player.car && s.player.car.upgrades.armor < 3, apply: s => { s.player.car.upgrades.armor++; } },
    { key: '4', name: 'Repaint car', cost: 40, can: s => !!s.player.car, apply: s => { s.player.car.color = CFG.CAR_COLORS[Math.floor(rng() * CFG.CAR_COLORS.length)]; } }
  ];

  function nearGarage(game) {
    const p = game.player;
    return !p.onFoot && p.car && Math.hypot(p.x - GARAGE.x, p.y - GARAGE.y) < 90 && Math.abs(p.car.speed) < 30;
  }

  function buyGarageItem(game, key) {
    const p = game.player;
    const item = GARAGE_ITEMS.find(i => i.key === key);
    if (!item || !p.car) return null;
    if (!item.can(game)) return 'not-available';
    if (p.cash < item.cost) return 'no-cash';
    p.cash -= item.cost;
    item.apply(game);
    global.SolaraAudio.jingle();
    return item.name;
  }

  // ---- repeatable street race ----
  const RACE_CHECKPOINTS = [
    { x: 1140, y: 840 }, { x: 1460, y: 520 }, { x: 1780, y: 840 },
    { x: 1460, y: 1160 }, { x: 820, y: 1160 }, { x: 1140, y: 840 }
  ];
  function makeRaceState() {
    return { active: null, step: 0, timer: 0, rivals: [], cooldown: 0, lastResult: '' };
  }
  function nearRaceStart(game) {
    const p = game.player;
    return Math.hypot(p.x - CFG.RACE_START.x, p.y - CFG.RACE_START.y) < 80;
  }
  function startRace(game) {
    const r = game.race;
    if (r.active || r.cooldown > 0) return false;
    r.active = { checkpoints: RACE_CHECKPOINTS, reward: 150, respect: 8 };
    r.step = 0; r.timer = 95;
    r.rivals = [0, 1].map(i => ({
      x: CFG.RACE_START.x - 40 - i * 46, y: CFG.RACE_START.y + (i ? 30 : -30),
      angle: 0, speed: 0, color: i ? '#c65aad' : '#2b2b2b', step: 0, finished: false, finishedAt: 0
    }));
    game.missions.message = 'Street race! Beat the rivals through 6 checkpoints.';
    return true;
  }
  function raceTarget(game) {
    const r = game.race;
    if (!r.active) return null;
    return r.active.checkpoints[Math.min(r.step, r.active.checkpoints.length - 1)];
  }
  function updateRace(game, dt) {
    const r = game.race;
    r.cooldown = Math.max(0, r.cooldown - dt);
    if (!r.active) return null;
    r.timer -= dt;
    if (r.timer <= 0) {
      r.active = null; r.cooldown = 10;
      game.missions.message = 'Race lost: out of time.';
      return 'failed';
    }
    const p = game.player;
    const t = raceTarget(game);
    if (t && Math.hypot(p.x - t.x, p.y - t.y) < 56) {
      r.step++;
      if (r.step >= r.active.checkpoints.length) return finishRace(game);
      game.missions.message = 'Race checkpoint ' + (r.step + 1) + '/' + r.active.checkpoints.length;
    }
    // Rivals drive the same checkpoints at a steady pace.
    for (const rv of r.rivals) {
      if (rv.finished) continue;
      const cp = r.active.checkpoints[Math.min(rv.step, r.active.checkpoints.length - 1)];
      const target = Math.atan2(cp.y - rv.y, cp.x - rv.x);
      let diff = target - rv.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      rv.angle += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
      rv.speed = Math.min(205, rv.speed + 150 * dt);
      rv.x += Math.cos(rv.angle) * rv.speed * dt;
      rv.y += Math.sin(rv.angle) * rv.speed * dt;
      if (Math.hypot(cp.x - rv.x, cp.y - rv.y) < 56) {
        rv.step++;
        if (rv.step >= r.active.checkpoints.length) { rv.finished = true; rv.finishedAt = 95 - r.timer; }
      }
    }
    return null;
  }
  function finishRace(game) {
    const r = game.race;
    const myTime = 95 - r.timer;
    const rivalTimes = r.rivals.map(v => v.finished ? v.finishedAt : 999);
    const place = 1 + rivalTimes.filter(t => t < myTime).length;
    r.active = null; r.cooldown = 10;
    if (place === 1) {
      game.player.cash += 150; game.player.respect += 8;
      addStanding(game, 'Downtown', 5);
      r.lastResult = 'Race won! +$150, +8 respect.';
      game.missions.message = r.lastResult;
      global.SolaraAudio.jingle();
      return 'done';
    }
    r.lastResult = 'Race finished ' + place + ' of 3 — no prize this time.';
    game.missions.message = r.lastResult;
    return 'done';
  }

  // ---- district standing ----
  const STANDING_TIERS = [[0, 'Unknown'], [15, 'Noticed'], [35, 'Respected'], [60, 'Feared']];
  function addStanding(game, district, n) {
    if (!game.player.standing) game.player.standing = {};
    game.player.standing[district] = (game.player.standing[district] || 0) + n;
  }
  function standingTier(game, district) {
    const v = (game.player.standing && game.player.standing[district]) || 0;
    let tier = STANDING_TIERS[0][1];
    for (const [min, name] of STANDING_TIERS) if (v >= min) tier = name;
    return { value: v, tier };
  }

  global.SolaraActivities = {
    GARAGE, GARAGE_ITEMS, nearGarage, buyGarageItem,
    RACE_CHECKPOINTS, makeRaceState, nearRaceStart, startRace, raceTarget, updateRace,
    addStanding, standingTier
  };
})(window);
