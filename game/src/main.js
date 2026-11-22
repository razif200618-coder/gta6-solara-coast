// main.js — SOLARA HEAT game loop, menus, save/load, missions, crime.
// States: menu → playing → paused / busted → menu. All original code.
// Rendering is 3D (WebGL, hand-written engine) on #gl with a 2D HUD
// overlay on #hud. The world logic is still the 2D x/y grid.
(function (global) {
  'use strict';
  const CFG = global.SolaraConfig, W = global.SolaraWorld;
  const glCanvas = document.getElementById('gl');
  const hudCanvas = document.getElementById('hud');
  const hud = hudCanvas.getContext('2d');
  const glOK = global.SolaraGL3D.init(glCanvas);
  if (!glOK) {
    hud.fillStyle = '#101820'; hud.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
    hud.fillStyle = '#fff'; hud.font = '20px sans-serif'; hud.textAlign = 'center';
    hud.fillText('WebGL is not available in this browser.', 640, 360);
  }
  // Surface script errors in the page title so headless runs can see them.
  window.addEventListener('error', function (e) { document.title = 'ERR: ' + (e.message || 'unknown'); });

  const game = {
    time: 0, state: 'menu', cam: { x: 0, y: 0 }, camHeading: 0,
    player: global.SolaraPlayer.makePlayer(),
    traffic: global.SolaraEntities.spawnTraffic(22),
    parked: [],
    peds: global.SolaraEntities.spawnPeds(40),
    police: global.SolaraPolice.makePolice(),
    missions: global.SolaraMissions.makeMissionState(),
    weapons: global.SolaraWeapons.makeWeaponState(),
    race: global.SolaraActivities.makeRaceState(),
    missionTarget: null,
    nearGarage: false, nearRaceStart: false,
    punchCooldown: 0, crashCooldown: 0
  };
  // Parked cars along the roads.
  (function () {
    const rng = global.solaraRng(99);
    for (let i = 0; i < 14; i++) {
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
        completed: game.missions.completed, x: game.player.x, y: game.player.y,
        weapon: game.player.weapon, ammo: game.player.ammo, standing: game.player.standing
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
      if (s.weapon) game.player.weapon = s.weapon;
      if (s.ammo != null) game.player.ammo = s.ammo;
      if (s.standing) game.player.standing = s.standing;
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
    // F fires the pistol (on foot or leaning out of the car).
    if (global.SolaraInput.was('f')) {
      const r = global.SolaraWeapons.shoot(game);
      if (r === 'empty') game.missions.message = 'Pistol is empty — find an ammo stash (green box).';
    }
    // 1/2 switch weapon.
    if (global.SolaraInput.was('1')) { global.SolaraWeapons.switchWeapon(game.player, 'fists'); game.missions.message = 'Weapon: FISTS.'; }
    if (global.SolaraInput.was('2')) { global.SolaraWeapons.switchWeapon(game.player, 'pistol'); game.missions.message = 'Weapon: PISTOL (' + (game.player.ammo || 0) + ' ammo).'; }
    // V cycles the radio station.
    if (global.SolaraInput.was('v')) game.missions.message = 'Radio: ' + global.SolaraAudio.cycleStation() + '.';
    // G opens the garage when parked at it.
    if (global.SolaraInput.was('g') && game.nearGarage) game.state = 'garage';
    // T starts a street race at the race start.
    if (global.SolaraInput.was('t') && game.nearRaceStart) global.SolaraActivities.startRace(game);
    // M starts the next mission.
    if (global.SolaraInput.was('m')) {
      if (!game.missions.active) {
        const next = global.SolaraMissions.MISSIONS.find(m => !game.missions.completed.includes(m.id));
        if (next) { global.SolaraMissions.startMission(game.missions, next.id - 1); global.SolaraWeapons.resetPickups(game); global.SolaraAudio.blip(660, 0.15, 'sine', 0.1); }
        else game.missions.message = 'All 10 missions complete — you are King of Solara!';
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
    if (res === 'done') {
      global.SolaraAudio.jingle(); saveGame();
      global.SolaraActivities.addStanding(game, W.districtAt(game.player.x, game.player.y), 10);
    }
    if (res === 'failed') { global.SolaraAudio.thud(); }
    global.SolaraActivities.updateRace(game, dt);
    global.SolaraWeapons.updateWeapons(game, dt);
    game.missionTarget = global.SolaraMissions.currentTarget(game.missions);
    game.nearGarage = global.SolaraActivities.nearGarage(game);
    game.nearRaceStart = global.SolaraActivities.nearRaceStart(game) && !game.race.active;
    global.SolaraAudio.update(dt, !game.player.onFoot, game.player.car ? game.player.car.speed : 0, game.police.wanted);
  }
  function drawMenu() {
    if (glOK) global.SolaraRender3D.drawWorld3D(game, true);
    hud.clearRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
    hud.fillStyle = 'rgba(0,0,0,0.55)'; hud.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
    hud.textAlign = 'center';
    hud.fillStyle = '#ffd94d'; hud.font = 'bold 72px sans-serif';
    hud.fillText('SOLARA HEAT', 640, 220);
    hud.fillStyle = '#fff'; hud.font = '24px sans-serif';
    hud.fillText('An original open-world crime game in Solara Coast', 640, 265);
    hud.font = '17px sans-serif';
    hud.fillText('Steal cars • Outrun the Solara police • 8 story missions • Street races', 640, 310);
    hud.fillText('WASD move / drive  •  E enter car  •  Space punch  •  M mission  •  P pause', 640, 345);
    const hasSave = !!localStorage.getItem(CFG.SAVE_KEY);
    hud.fillStyle = '#ffd94d'; hud.font = 'bold 20px sans-serif';
    hud.fillText(hasSave ? 'Press ENTER to play  •  C to continue your save' : 'Press ENTER to play', 640, 420);
    hud.fillStyle = 'rgba(255,255,255,0.8)'; hud.font = '14px sans-serif';
    hud.fillText('All names, story, art and sound are original. No Rockstar / GTA content.', 640, 470);
    hud.textAlign = 'left';
  }
  function draw() {
    if (game.state === 'menu') { drawMenu(); return; }
    if (glOK) global.SolaraRender3D.drawWorld3D(game, false);
    hud.clearRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
    global.SolaraHUD.drawHUD(hud, game);
    if (game.state === 'paused') {
      hud.fillStyle = 'rgba(0,0,0,0.6)'; hud.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
      hud.fillStyle = '#fff'; hud.font = 'bold 48px sans-serif'; hud.textAlign = 'center';
      hud.fillText('PAUSED', 640, 360); hud.font = '18px sans-serif';
      hud.fillText('Press P to resume', 640, 400); hud.textAlign = 'left';
    }
    if (game.state === 'busted') {
      hud.fillStyle = 'rgba(0,0,0,0.7)'; hud.fillRect(0, 0, CFG.VIEW_W, CFG.VIEW_H);
      hud.fillStyle = '#ff5a4d'; hud.font = 'bold 56px sans-serif'; hud.textAlign = 'center';
      hud.fillText('BUSTED!', 640, 330);
      hud.fillStyle = '#fff'; hud.font = '18px sans-serif';
      hud.fillText('The Solara police caught you. -$50. Press ENTER to try again.', 640, 380);
      hud.textAlign = 'left';
    }
  }
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (game.state === 'menu') {
      game.time += dt;
      if (global.SolaraInput.was('enter')) startPlaying();
      if (global.SolaraInput.was('c') && loadGame()) startPlaying();
    } else if (game.state === 'playing') {
      if (global.SolaraInput.was('p')) game.state = 'paused';
      else update(dt);
    } else if (game.state === 'garage') {
      // Garage menu: 1-4 buy, G or Esc leaves.
      for (const k of ['1', '2', '3', '4']) {
        if (global.SolaraInput.was(k)) {
          const r = global.SolaraActivities.buyGarageItem(game, k);
          if (r && r !== 'not-available' && r !== 'no-cash') game.missions.message = 'Garage: ' + r + ' — done.';
          else if (r === 'no-cash') game.missions.message = 'Garage: not enough cash.';
          else if (r === 'not-available') game.missions.message = 'Garage: already maxed / not needed.';
        }
      }
      if (global.SolaraInput.was('g') || global.SolaraInput.was('escape')) game.state = 'playing';
      game.time += dt; // keep the world alive behind the menu
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
    // Extra density near the player for every shot: traffic + pedestrians
    // clustered on the beachfront boulevard and the streets around it.
    // Pedestrians are kept at least minD away from the player so the
    // player stays the clear subject of the shot.
    function crowd(cx, cy, minD) {
      minD = minD || 0;
      const rng = global.solaraRng(4242);
      for (let i = 0; i < 6; i++) {
        const rx = W.roadsV[Math.floor(rng() * W.roadsV.length)];
        game.traffic.push(global.SolaraEntities.makeCar(rx + (rng() < 0.5 ? -14 : 14), cy + (rng() - 0.5) * 500, rng() < 0.5 ? 0 : Math.PI, null, true));
      }
      for (let i = 0; i < 8; i++) {
        let px = cx + (rng() - 0.5) * 500, py = cy + (rng() - 0.5) * 260;
        if (minD > 0) {
          const d = Math.hypot(px - game.player.x, py - game.player.y);
          if (d < minD) { const a = Math.atan2(py - game.player.y, px - game.player.x); px = game.player.x + Math.cos(a) * minD; py = game.player.y + Math.sin(a) * minD; }
        }
        game.peds.push({ x: px, y: py, angle: rng() * Math.PI * 2, speed: 24, name: 'Local', flee: 0, color: ['#e07a5f', '#3d7dd9', '#4fae62', '#e8c33d'][i % 4], height: 1, hat: i % 3 === 0 });
      }
    }
    if (demo === 'chase') {
      // 4-star chase down the beachfront boulevard, sea to the south (right).
      game.player.x = 820; game.player.y = 1480;
      game.player.weapon = 'pistol'; game.player.ammo = 12;
      const car = global.SolaraEntities.makeCar(820, 1480, 0, '#d94f3d', false);
      game.player.onFoot = false; game.player.car = car; game.parked.push(car);
      car.speed = 220;
      global.SolaraMissions.startMission(game.missions, 5); // Harbor Heist
      game.missions.pickedUp = true;
      global.SolaraPolice.addWanted(game.police, 4, game);
      game.police.cars = [
        { x: 700, y: 1420, angle: 0, speed: 260, color: '#1c2f4a', hp: 3, disabled: false },
        { x: 700, y: 1540, angle: 0, speed: 250, color: '#1c2f4a', hp: 3, disabled: false },
        { x: 1060, y: 1480, angle: Math.PI, speed: 240, color: '#1c2f4a', hp: 3, disabled: false }
      ];
      crowd(1000, 1480, 130);
    } else if (demo === 'drive') {
      // Cruising the palm-lined beachfront boulevard, sea on the right.
      game.player.x = 520; game.player.y = 1480;
      const car = global.SolaraEntities.makeCar(520, 1480, 0, '#3d7dd9', false);
      game.player.onFoot = false; game.player.car = car; game.parked.push(car); car.speed = 180;
      crowd(800, 1480);
    } else if (demo === 'mission') {
      // Courier Run, driving east along the beachfront road toward the
      // Beach Cafe, sea on the right, palms and traffic ahead.
      game.player.x = 1000; game.player.y = 1480;
      const car = global.SolaraEntities.makeCar(1000, 1480, 0, '#e8c33d', false);
      game.player.onFoot = false; game.player.car = car; game.parked.push(car); car.speed = 170;
      global.SolaraMissions.startMission(game.missions, 1); // Courier Run
      crowd(1150, 1480, 130);
    } else if (demo === 'foot') {
      // On foot on the beachfront boulevard sidewalk, stolen car beside you,
      // palms and traffic ahead, beach and sea to the right.
      game.player.x = 1500; game.player.y = 1440;
      game.player.angle = 0; game.player.weapon = 'pistol'; game.player.ammo = 12;
      const car = global.SolaraEntities.makeCar(1560, 1480, 0, '#4fae62', false);
      game.parked.push(car);
      crowd(1750, 1480, 160);
    }
  }
  applyDemo();
  requestAnimationFrame(loop);
  // Exposed for headless testing.
  global.SolaraGame = game;
})(window);
