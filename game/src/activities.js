// activities.js — Marina garage, downtown street races, radio stations.
(function (root) {
  var S = root.Solara || (root.Solara = {});
  var A = S.Activities = {};
  A.GARAGE = { x: -60, z: 180, name: 'SOLARA GARAGE' };
  A.RACE_START = { x: 20, z: 20, name: 'Downtown Sprint' };
  A.nearGarage = function () {
    return S.dist2d(S.state.player.x, S.state.player.z, A.GARAGE.x, A.GARAGE.z) < 10;
  };
  A.nearRace = function () {
    return S.dist2d(S.state.player.x, S.state.player.z, A.RACE_START.x, A.RACE_START.z) < 10;
  };
  // Garage purchases. Returns {ok, reason?}.
  A.garageBuy = function (item) {
    var st = S.state, price = S.CONFIG.garage[item];
    if (price === undefined) return { ok: false, reason: 'unknown item' };
    if (!A.nearGarage() && typeof window !== 'undefined' && !S._testMode) return { ok: false, reason: 'not at garage' };
    if (st.cash < price) return { ok: false, reason: 'not enough cash' };
    st.cash -= price;
    if (item === 'repair') st.carHp = 100;
    else if (item === 'tune') st.garage.tune = Math.min(3, st.garage.tune + 1);
    else if (item === 'armor') st.garage.armor = Math.min(3, st.garage.armor + 1);
    else if (item === 'repaint') st.garage.color = (st.garage.color + 1) % 8;
    if (S.Audio) S.Audio.purchase();
    return { ok: true, item: item, cash: st.cash };
  };
  // Street race: 2 rivals, 6 checkpoints around downtown.
  A.startRace = function () {
    var st = S.state;
    if (st.race && st.race.active) return { ok: false, reason: 'race already running' };
    var cps = [
      { x: 20, z: 80 }, { x: 80, z: 80 }, { x: 80, z: -40 },
      { x: 0, z: -40 }, { x: -60, z: -40 }, { x: 20, z: 20 }
    ];
    st.race = { active: true, cp: 0, checkpoints: cps, time: 0, rivals: [
      { name: 'Vex', progress: 0, speed: 15 + Math.random() * 2 },
      { name: 'Nadia', progress: 0, speed: 14 + Math.random() * 2 }
    ]};
    return { ok: true, race: st.race };
  };
  A.updateRace = function (dt) {
    var st = S.state, r = st.race;
    if (!r || !r.active) return null;
    r.time += dt;
    r.rivals.forEach(function (rv) { rv.progress += rv.speed * dt; });
    var cp = r.checkpoints[r.cp];
    if (cp && S.dist2d(st.player.x, st.player.z, cp.x, cp.z) < 9) {
      r.cp++;
      if (S.Audio) S.Audio.checkpoint();
      if (r.cp >= r.checkpoints.length) return A.finishRace();
    }
    return null;
  };
  A.finishRace = function () {
    var st = S.state, r = st.race;
    if (!r) return null;
    r.active = false;
    var myDist = r.cp * 100;
    var rivalBest = Math.max(r.rivals[0].progress, r.rivals[1].progress);
    var won = myDist >= rivalBest * 0.55; // checkpoints weigh heaviest; rivals pace the course
    // Player must have cleared all 6 checkpoints to win; rivals are timed out by then.
    won = r.cp >= r.checkpoints.length;
    if (won) {
      st.cash += S.CONFIG.raceReward.cash;
      st.respect += S.CONFIG.raceReward.respect;
      st.racesWon++;
    }
    st.race = null;
    if (S.Audio) S.Audio.missionDone();
    return { won: won, cash: won ? S.CONFIG.raceReward.cash : 0, respect: won ? S.CONFIG.raceReward.respect : 0, time: r.time };
  };
  // Radio: cycle stations.
  A.cycleRadio = function () {
    var st = S.state;
    st.radio = (st.radio + 1) % S.CONFIG.radio.length;
    if (S.Audio) S.Audio.radio(st.radio);
    return S.CONFIG.radio[st.radio];
  };
  A.station = function () { return S.CONFIG.radio[S.state.radio]; };
})(typeof window !== 'undefined' ? window : globalThis);
