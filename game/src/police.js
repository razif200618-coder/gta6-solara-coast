// police.js — wanted level 1–5, police chases, roadblocks, helicopter, Busted.
(function (root) {
  var S = root.Solara || (root.Solara = {});
  var P = S.Police = { cruisers: [], heli: null, coolTimer: 0 };
  P.spawnCruisers = function (n) {
    P.cruisers = [];
    for (var i = 0; i < n; i++) {
      P.cruisers.push({
        id: 'cop' + i, x: S.state.player.x + (i % 2 ? 40 : -40), z: S.state.player.z + 30,
        angle: 0, speed: 0, hp: 3, color: '#1c2733', siren: true
      });
    }
    return P.cruisers;
  };
  P.addWanted = function (stars, reason) {
    var st = S.state;
    st.wanted = S.clamp(st.wanted + stars, 0, S.CONFIG.maxWanted);
    st.heat = 100;
    P.coolTimer = 0;
    P.applyLevel();
    return st.wanted;
  };
  P.applyLevel = function () {
    var st = S.state;
    if (st.wanted >= 3) { st.roadblock = true; } else { st.roadblock = false; }
    if (st.wanted >= 4) { st.helicopter = true; if (!P.heli) P.heli = { x: st.player.x, z: st.player.z, y: 55, angle: 0 }; }
    else { st.helicopter = false; P.heli = null; }
    var want = Math.min(st.wanted, 4);
    if (st.wanted > 0 && P.cruisers.length < want) P.spawnCruisers(want);
    if (st.wanted === 0) P.cruisers = [];
  };
  P.update = function (dt) {
    var st = S.state;
    if (st.wanted === 0) return;
    var i, c;
    for (i = 0; i < P.cruisers.length; i++) {
      c = P.cruisers[i];
      if (c.hp <= 0) continue;
      var dx = st.player.x - c.x, dz = st.player.z - c.z;
      var d = Math.sqrt(dx * dx + dz * dz) || 1;
      c.angle = Math.atan2(dx, dz);
      c.speed = S.clamp(c.speed + 14 * dt, 0, 26 + st.wanted * 1.5);
      c.x += Math.sin(c.angle) * c.speed * dt;
      c.z += Math.cos(c.angle) * c.speed * dt;
      // Caught: cruiser touches the player on foot at low speed, or rams the car hard.
      if (d < 3.5 && !st.player.inCar) P.bust('Caught on foot by the Solara PD');
      if (d < 4 && st.player.inCar && Math.abs(st.player.speed || 0) < 2) P.bust('Your car was boxed in by the Solara PD');
    }
    if (P.heli) {
      P.heli.x += (st.player.x - P.heli.x) * dt * 0.5;
      P.heli.z += (st.player.z - P.heli.z) * dt * 0.5;
      P.heli.angle += dt;
    }
    // Cool down when far from all cruisers and not committing crimes.
    var far = true;
    for (i = 0; i < P.cruisers.length; i++) {
      if (S.dist2d(st.player.x, st.player.z, P.cruisers[i].x, P.cruisers[i].z) < 45) far = false;
    }
    if (far) {
      P.coolTimer += dt;
      if (P.coolTimer > 12) { st.wanted = Math.max(0, st.wanted - 1); P.coolTimer = 0; P.applyLevel(); }
    } else P.coolTimer = 0;
  };
  P.bust = function (reason) {
    var st = S.state;
    if (st.busted) return;
    st.busted = true;
    st.bustReason = reason || 'Busted';
    st.cash = Math.max(0, st.cash - 100);
    st.wanted = 0; st.roadblock = false; st.helicopter = false; P.cruisers = []; P.heli = null;
    if (S.Audio) S.Audio.busted();
    return st.busted;
  };
  P.clearBusted = function () {
    var st = S.state;
    st.busted = false; st.bustReason = null;
    st.player.x = -40; st.player.z = 40; st.player.inCar = false; st.car = null;
    return true;
  };
  // Shooting a cruiser: 3 hits disables it and drops a star of heat.
  P.hitCruiser = function (cruiser) {
    if (!cruiser || cruiser.hp <= 0) return 0;
    cruiser.hp -= 1;
    if (cruiser.hp <= 0) {
      cruiser.speed = 0;
      S.state.cash += 25;
      return 'disabled';
    }
    return cruiser.hp;
  };
})(typeof window !== 'undefined' ? window : globalThis);
