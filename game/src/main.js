// main.js — SOLARA HEAT game loop, state machine, save/load, demo presets,
// action dispatch. Boots when the DOM is ready; safe to load under Node stubs.
(function (root) {
  var S = root.Solara || (root.Solara = {});
  var M = S.Main = { raf: null, last: 0, t: 0, _musicAcc: 0 };

  M.save = function () {
    try {
      var st = S.state;
      var data = {
        cash: st.cash, respect: st.respect, wanted: st.wanted, ammo: st.ammo,
        weapon: st.weapon, carHp: st.carHp, playerHp: st.playerHp,
        missionIndex: st.missionIndex, missionsDone: st.missionsDone,
        racesWon: st.racesWon, carsStolen: st.carsStolen,
        garage: st.garage, radio: st.radio,
        player: { x: st.player.x, z: st.player.z, angle: st.player.angle }
      };
      var ls = (typeof localStorage !== 'undefined') ? localStorage : root.localStorage;
      if (ls) ls.setItem(S.CONFIG.saveKey, JSON.stringify(data));
      return true;
    } catch (e) { return false; }
  };
  M.load = function () {
    try {
      var ls = (typeof localStorage !== 'undefined') ? localStorage : root.localStorage;
      if (!ls) return false;
      var raw = ls.getItem(S.CONFIG.saveKey);
      if (!raw) return false;
      var d = JSON.parse(raw);
      var st = S.state;
      st.cash = d.cash; st.respect = d.respect; st.wanted = d.wanted || 0; st.ammo = d.ammo;
      st.weapon = d.weapon; st.carHp = d.carHp; st.playerHp = d.playerHp;
      st.missionIndex = d.missionIndex; st.missionsDone = d.missionsDone;
      st.racesWon = d.racesWon; st.carsStolen = d.carsStolen;
      st.garage = d.garage; st.radio = d.radio || 0;
      if (d.player) { st.player.x = d.player.x; st.player.z = d.player.z; st.player.angle = d.player.angle; }
      S.Police.applyLevel();
      return true;
    } catch (e) { return false; }
  };
  M.startGame = function () {
    var st = S.state;
    st.started = true; st.paused = false; st.busted = false;
    if (!st.mission && S.Missions.current()) S.Missions.start();
    if (S.Audio) S.Audio.ensure();
    return true;
  };
  M.onAction = function (action) {
    var st = S.state;
    if (action === 'start') { if (!st.started) { M.startGame(); } return; }
    if (!st.started) return;
    if (action === 'pause') {
      if (st.busted) { S.Police.clearBusted(); M.save(); return; }
      st.paused = !st.paused; return;
    }
    if (st.paused || st.busted) return;
    if (action === 'enterCar') {
      var r = S.Player.toggleCar();
      if (r.action === 'enter') S.HUD.showToast('Car stolen — the PD noticed');
      else if (r.action === 'none') S.HUD.showToast('No car nearby');
    } else if (action === 'shoot') {
      if (st.player.inCar) { var f = S.Weapons.fire(); if (f.reason === 'no ammo') S.HUD.showToast('Out of ammo — find a green stash'); }
      else {
        if (st.weapon === 'fists') { var hit = S.Weapons.fire(); if (hit.hit === 'pedestrian') S.HUD.showToast('That drew the cops!'); }
        else { var f2 = S.Weapons.fire(); if (f2.reason === 'no ammo') S.HUD.showToast('Out of ammo — find a green stash'); }
      }
    } else if (action === 'fists') S.Weapons.switchTo('fists');
    else if (action === 'pistol') S.Weapons.switchTo('pistol');
    else if (action === 'garage') {
      if (S.Activities.nearGarage()) S.HUD.showToast('Garage: Repair $50 • Tune $200 • Armor $150 • Repaint $40 (use buttons)');
      else S.HUD.showToast('Garage is at the Marina (teal marker)');
    } else if (action === 'race') {
      if (S.Activities.nearRace()) { S.Activities.startRace(); S.HUD.showToast('Race started — 6 checkpoints!'); }
      else S.HUD.showToast('Races start downtown (pink marker)');
    } else if (action === 'radio') {
      var name = S.Activities.cycleRadio();
      S.HUD.showToast('Radio: ' + name);
    } else if (action === 'mute') {
      var m = S.Audio.setMuted(!S.Audio.muted);
      S.HUD.showToast(m ? 'Muted' : 'Sound on');
    }
  };
  // Demo presets for screenshots: ?demo=chase|drive|mission|foot
  M.applyDemo = function (name) {
    var st = S.state;
    st.started = true; st.paused = false; st.busted = false;
    S.World.build(); S.Entities.spawn();
    if (name === 'chase') {
      // Beachfront boulevard (road x=-120, open to the sea, no buildings behind).
      st.player.x = -120; st.player.z = -20; st.player.angle = 0;
      st.player.inCar = true;
      st.car = { id: 'demo', x: -120, z: -20, angle: 0, speed: 18, color: '#c0392b', hp: 82 };
      st.carHp = 82; st.wanted = 3; S.Police.applyLevel();
      S.Police.cruisers.forEach(function (c, i) {
        if (i === 0) { c.x = -128; c.z = 8; } // lead cruiser ahead-left, visible in frame
        else { c.x = -128 + i * 9; c.z = -48; }
        c.speed = 20;
      });
      if (!st.mission) S.Missions.start();
    } else if (name === 'drive') {
      // Beachfront boulevard heading north, palms + sea on the left.
      st.player.x = -120; st.player.z = 60; st.player.angle = 0;
      st.player.inCar = true;
      st.car = { id: 'demo', x: -120, z: 60, angle: 0, speed: 22, color: '#f1c40f', hp: 100 };
      st.carHp = 100; st.wanted = 0; S.Police.applyLevel();
      if (!st.mission) S.Missions.start();
    } else if (name === 'mission') {
      // On the Marina road heading for the mission-1 target.
      st.player.x = -60; st.player.z = 110; st.player.angle = 0;
      st.player.inCar = true;
      st.car = { id: 'demo', x: -60, z: 110, angle: 0, speed: 8, color: '#2980b9', hp: 100 };
      st.wanted = 1; S.Police.applyLevel();
      S.Missions.start();
    } else if (name === 'foot') {
      // On foot on the beach among palms and umbrellas.
      st.player.x = -150; st.player.z = 20; st.player.angle = 0.6;
      st.player.inCar = false; st.car = null;
      st.wanted = 0; S.Police.applyLevel();
      if (!st.mission) S.Missions.start();
    }
    return name;
  };
  M.update = function (dt) {
    var st = S.state;
    if (!st.started || st.paused || st.busted) return;
    M.t += dt;
    S.Player.update(dt, S.Input);
    S.Entities.update(dt, M.t);
    S.Police.update(dt);
    S.Weapons.checkStash();
    var done = S.Missions.checkProgress();
    if (done) {
      S.HUD.showToast('Mission complete! +$' + done.cash + ' +' + done.respect + ' respect');
      if (S.Missions.current()) S.Missions.start();
      M.save();
    }
    var raceDone = S.Activities.updateRace(dt);
    if (raceDone) {
      S.HUD.showToast(raceDone.won ? 'Race won! +$150 +8 respect' : 'Race lost — try again downtown');
      M.save();
    }
    M._musicAcc += dt;
    if (M._musicAcc > 0.55) { M._musicAcc = 0; if (S.Audio) S.Audio.musicStep(); }
    if (st.wanted > 0 && Math.random() < dt * 0.25) S.Audio.siren();
  };
  M.frame = function (now) {
    var dt = Math.min(0.05, (now - M.last) / 1000 || 0.016);
    M.last = now;
    M.update(dt);
    var canvas = (typeof document !== 'undefined') ? document.getElementById('gl') : null;
    if (canvas) S.Render.render(canvas, M.t);
    if (S.HUD) S.HUD.update();
    if (typeof requestAnimationFrame !== 'undefined') M.raf = requestAnimationFrame(M.frame);
  };
  M.boot = function () {
    if (typeof document === 'undefined') return false;
    var canvas = document.getElementById('gl');
    if (canvas) {
      canvas.width = 1280; canvas.height = 720;
      S.Engine.init(canvas);
    }
    // Build the world AFTER the GL context exists so facade textures can bind.
    S.World.build(); S.Entities.spawn();
    S.Input.attach();
    var params = new URLSearchParams(window.location.search || '');
    var demo = params.get('demo');
    if (demo) { M.applyDemo(demo); }
    else {
      var had = M.load();
      if (!had) S.Missions.start();
      else if (!S.state.mission && S.Missions.current()) S.Missions.start();
    }
    // Garage buttons.
    ['repair', 'tune', 'armor', 'repaint'].forEach(function (item) {
      var b = document.getElementById('garage-' + item);
      if (b) b.addEventListener('click', function () {
        var r = S.Activities.garageBuy(item);
        S.HUD.showToast(r.ok ? item + ' done' : ('Garage: ' + (r.reason || 'failed')));
        M.save();
      });
    });
    var startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.addEventListener('click', function () { M.startGame(); });
    var resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) resumeBtn.addEventListener('click', function () { S.state.paused = false; });
    var retryBtn = document.getElementById('retry-btn');
    if (retryBtn) retryBtn.addEventListener('click', function () { S.Police.clearBusted(); M.save(); });
    M.last = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
    S.HUD.update();
    if (typeof requestAnimationFrame !== 'undefined') M.raf = requestAnimationFrame(M.frame);
    // One static frame immediately so screenshots capture a rendered scene even
    // if the animation loop is throttled in headless Chrome.
    if (canvas) S.Render.render(canvas, 0.5);
    S.HUD.update();
    return true;
  };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', M.boot);
    else M.boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
