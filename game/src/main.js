// main.js — SOLARA HEAT game loop, menus, save/load, missions, crime.
// States: menu → playing → paused / busted → menu. All original code.
(function (global) {
  'use strict';
  const CFG = global.SolaraConfig, W = global.SolaraWorld;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = CFG.VIEW_W; canvas.height = CFG.VIEW_H;

  const game = {
    time: 0, state: 'menu', cam: { x: 0, y: 0 },
    player: global.SolaraPlayer.makePlayer(),
    traffic: global.SolaraEntities.spawnTraffic(14),
    parked: [],
    peds: global.SolaraEntities.spawnPeds(24),
    police: global.SolaraPolice.makePolice(),
    missions: global.SolaraMissions.makeMissionState(),
    missionTarget: null,
    punchCooldown: 0, crashCooldown: 0
  };
  // Parked cars along the roads.
  (function () {
    const rng = global.solaraRng(99);
    for (let i = 0; i < 9; i++) {
      const rx = W.roadsV[Math.floor(rng() * W.roadsV.length)];
      const ry = W.roadsH[Math.floor(rng() * W.roadsH.length)];
      game.parked.push(global.SolaraEntities.makeCar(rx + 26, ry + (rng() < 0.5 ? -52 : 52), rng() < 0.5 ? 0 : Math.PI / 2, null, false));
    }
  })();
  game.onPunch = function () {
    if (game.punchCooldown > 0) return;
    game.punchCooldown = 1.5;
    for (const p of game.peds) {
      if (Math.hypot(p.x - game.player.x, p.y - game.player.y) < 40) {
        p.flee = 2; global.SolaraPolice.addWanted(game.police, 1, game);
        game.missions.message = 'You hit a pedestrian! Wanted level up.';
        return;
      }
    }
  };
  game.onCrash = function () {
    if (game.crashCooldown > 0) return; game.crashCooldown = 1;
    global.SolaraAudio.thud();
  };
  game.onBusted = function () {
    game.state = 'busted'; game.player.cash = Math.max(0, game.player.cash - 50);
    global.SolaraPolice.makePolice.call(null);
    game.police = global.SolaraPolice.makePolice();
    saveGame();
  };
  function saveGame() {
    try {
      localStorage.setItem(CFG.SAVE_KEY, JSON.stringify({
        cash: game.player.cash, respect: game.player.respect,
        completed: game.missions.completed, x: game.player.x, y: game.player.y
      }));
    } catch (e) {}
  }
  function loadGame() {
    try {
      const s = JSON.parse(localStorage.getItem(CFG.SAVE_KEY) || 'null');
      if (!s) return false;
      game.player.cash = s.cash || 0; game.player.respect = s.respect || 0;
      game.missions.completed = s.completed || [];
      game.player.x = s.x || 520; game.player.y = s.y || 520;
      return true;
    } catch (e) { return false; }
  }
  function startPlaying() {
    game.state = 'playing'; global.SolaraAudio.ensure();
    global.SolaraInput.clearPressed();
  }
  function enterExitCar() {
    const p = game.player;
    if (p.onFoot) {
      const all = game.traffic.concat(game.parked);
      const c = global.SolaraPlayer.nearestCar(p, all, 56);
      if (c) {
        p.onFoot = false; p.car = c;
        // Stealing a moving traffic car is a crime.
        if (c.traffic) global.SolaraPolice.addWanted(game.police, 1, game);
        game.missions.message = c.traffic ? 'Car stolen! The police are watching.' : 'You took the car.';
        // Remove from traffic list so it stops its AI.
        game.traffic = game.traffic.filter(t => t !== c);
        game.parked = game.parked.filter(t => t !== c);
      }
    } else {
      p.onFoot = true;
      const car = p.car; p.car = null;
      p.x = car.x + 30; p.y = car.y + 30;
      game.parked.push(car); // leave it parked where it stops
    }
  }
  function update(dt) {
    game.time += dt;
    game.punchCooldown = Math.max(0, game.punchCooldown - dt);
    game.crashCooldown = Math.max(0, game.crashCooldown - dt);
    const input = global.SolaraInput.down();
    // E to enter/exit a car.
    if (global.SolaraInput.was('e')) enterExitCar();
    // M starts the next mission.
    if (global.SolaraInput.was('m')) {
      if (!game.missions.active) {
        const next = global.SolaraMissions.MISSIONS.find(m => !game.missions.completed.includes(m.id));
        if (next) { global.SolaraMissions.startMission(game.missions, next.id - 1); global.SolaraAudio.blip(660, 0.15, 'sine', 0.1); }
        else game.missions.message = 'All 8 missions complete — you are King of Solara!';
      }
    }
    // R resets the player to the hideout.
    if (global.SolaraInput.was('r')) { game.player.x = 420; game.player.y = 420; if (!game.player.onFoot) { game.player.onFoot = true; game.player.car = null; } }
    global.SolaraPlayer.updatePlayer(game.player, input, dt, game);
    global.SolaraEntities.updateTraffic(game.traffic, dt, game.player.car);
    // Pedestrians flee from a fast car or a punching player.
    const danger = (!game.player.onFoot && game.player.car && Math.abs(game.player.car.speed) > 60) ? game.player : (game.player.punchTimer > 0.2 ? game.player : null);
    global.SolaraEntities.updatePeds(game.peds, dt, danger);
    // Hitting a pedestrian with a car is a crime.
    if (!game.player.onFoot && game.player.car && Math.abs(game.player.car.speed) > 80) {
      for (const ped of game.peds) {
        if (Math.hypot(ped.x - game.player.x, ped.y - game.player.y) < 26) {
          ped.flee = 3; global.SolaraPolice.addWanted(game.police, 1, game);
          ped.x += (ped.x - game.player.x) * 0.5; ped.y += (ped.y - game.player.y) * 0.5;
        }
      }
    }
    global.SolaraPolice.updatePolice(game.police, dt, game);
    const res = global.SolaraMissions.updateMission(game.missions, game.player, game.police, dt);
    if (res === 'done') { global.SolaraAudio.jingle(); saveGame(); }
    if (res === 'failed') { global.SolaraAudio.thud(); }
    game.missionTarget = global.SolaraMissions.currentTarget(game.missions);
    global.SolaraAudio.update(dt, !game.player.onFoot, game.player.car ? game.player.car.speed : 0, game.police.wanted);
    // Camera follows the player.
    game.cam.x = Math.max(0, Math.min(CFG.WORLD_W - CFG.VIEW_W, game.player.x - CFG.VIEW_W / 2));
    game.cam.y = Math.max(0, Math.min(CFG.WORLD_H - CFG.VIEW_H, game.player.y - CFG.VIEW_H / 2));
  }
  function drawMenu() {
    global.SolaraRender.drawWorld(ctx, game, { x: 400, y: 200 });
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd94d'; ctx.font = 'bold 72px sans-serif';
    ctx.fillText('SOLARA HEAT', 640, 220);
    ctx.fillStyle = '#fff'; ctx.font = '24px sans-serif';
    ctx.fillText('An original open-world crime game in Solara Coast', 640, 265);
    ctx.font = '17px sans-serif';
    ctx.fillText('Steal cars • Outrun the Solara police • 8 story missions • Street races', 640, 310);
    ctx.fillText('WASD move / drive  •  E enter car  •  Space punch  •  M mission  •  P pause', 640, 345);
    const hasSave = !!localStorage.getItem(CFG.SAVE_KEY);
    ctx.fillStyle = '#ffd94d'; ctx.font = 'bold 20px sans-serif';
    ctx.fillText(hasSave ? 'Press ENTER to play  •  C to continue your save' : 'Press ENTER to play', 640, 420);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = '14px sans-serif';
    ctx.fillText('All names, story, art and sound are original. No Rockstar / GTA content.', 640, 470);
    ctx.textAlign = 'left';
  }
  function draw() {
    if (game.state === 'menu') { drawMenu(); return; }
    global.SolaraRender.drawWorld(ctx, game, game.cam);
    global.SolaraHUD.drawHUD(ctx, game);
    if (game.state === 'paused') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('PAUSED', 640, 360); ctx.font = '18px sans-serif';
      ctx.fillText('Press P to resume', 640, 400); ctx.textAlign = 'left';
    }
    if (game.state === 'busted') {
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
      ctx.fillStyle = '#ff5a4d'; ctx.font = 'bold 56px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('BUSTED!', 640, 330);
      ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif';
      ctx.fillText('The Solara police caught you. -$50. Press ENTER to try again.', 640, 380);
      ctx.textAlign = 'left';
    }
  }
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (game.state === 'menu') {
      if (global.SolaraInput.was('enter')) startPlaying();
      if (global.SolaraInput.was('c') && loadGame()) startPlaying();
    } else if (game.state === 'playing') {
      if (global.SolaraInput.was('p')) game.state = 'paused';
      else update(dt);
    } else if (game.state === 'paused') {
      if (global.SolaraInput.was('p')) game.state = 'playing';
    } else if (game.state === 'busted') {
      if (global.SolaraInput.was('enter')) { game.player.x = 420; game.player.y = 420; game.player.onFoot = true; game.player.car = null; game.state = 'playing'; }
    }
    draw();
    requestAnimationFrame(loop);
  }
  // Demo presets for screenshots (?demo=chase|drive|mission|foot|menu).
  // These set up a real gameplay state; the game still plays normally.
  function applyDemo() {
    const q = new URLSearchParams(location.search);
    const demo = q.get('demo');
    if (!demo || demo === 'menu') return;
    startPlaying();
    if (demo === 'chase') {
      game.player.x = 1140; game.player.y = 840;
      const car = global.SolaraEntities.makeCar(1140, 840, 0, '#d94f3d', false);
      game.player.onFoot = false; game.player.car = car; game.parked.push(car);
      car.speed = 220;
      global.SolaraMissions.startMission(game.missions, 5); // Harbor Heist
      game.missions.pickedUp = true;
      global.SolaraPolice.addWanted(game.police, 3, game);
      game.police.cars = [
        { x: 900, y: 700, angle: 0.4, speed: 260, color: '#1c2f4a' },
        { x: 900, y: 980, angle: -0.3, speed: 250, color: '#1c2f4a' },
        { x: 1400, y: 700, angle: 2.6, speed: 240, color: '#1c2f4a' }
      ];
    } else if (demo === 'drive') {
      game.player.x = 820; game.player.y = 520;
      const car = global.SolaraEntities.makeCar(820, 520, 0, '#3d7dd9', false);
      game.player.onFoot = false; game.player.car = car; game.parked.push(car); car.speed = 180;
    } else if (demo === 'mission') {
      game.player.x = 1000; game.player.y = 1400;
      const car = global.SolaraEntities.makeCar(1000, 1400, -Math.PI / 2, '#e8c33d', false);
      game.player.onFoot = false; game.player.car = car; game.parked.push(car); car.speed = 170;
      global.SolaraMissions.startMission(game.missions, 1); // Courier Run
    } else if (demo === 'foot') {
      game.player.x = 1140; game.player.y = 840;
    }
    game.cam.x = Math.max(0, Math.min(CFG.WORLD_W - CFG.VIEW_W, game.player.x - CFG.VIEW_W / 2));
    game.cam.y = Math.max(0, Math.min(CFG.WORLD_H - CFG.VIEW_H, game.player.y - CFG.VIEW_H / 2));
  }
  applyDemo();
  requestAnimationFrame(loop);
  // Exposed for headless testing.
  global.SolaraGame = game;
})(window);
