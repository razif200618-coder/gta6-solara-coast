// weapons.js — fists and pistol, ammo, stashes, shooting.
(function (root) {
  var S = root.Solara || (root.Solara = {});
  var W = S.Weapons = {};
  W.list = [
    { id: 'fists', name: 'Fists', key: '1', damage: 1, range: 2.5, ammo: Infinity },
    { id: 'pistol', name: 'Pistol', key: '2', damage: 2, range: 40, ammo: 12 }
  ];
  W.current = function () {
    return W.list.filter(function (w) { return w.id === S.state.weapon; })[0] || W.list[0];
  };
  W.switchTo = function (id) {
    if (!W.list.some(function (w) { return w.id === id; })) return false;
    S.state.weapon = id;
    return true;
  };
  // Fire at the nearest valid target in front of the player. Returns a report.
  W.fire = function () {
    var st = S.state;
    var w = W.current();
    if (w.id === 'pistol') {
      if (st.ammo <= 0) { if (S.Audio) S.Audio.emptyClick(); return { ok: false, reason: 'no ammo' }; }
      st.ammo -= 1;
    }
    if (S.Audio) S.Audio.shot(w.id);
    // Nearest cruiser in range.
    var best = null, bd = w.range;
    (S.Police.cruisers || []).forEach(function (c) {
      if (c.hp <= 0) return;
      var d = S.dist2d(st.player.x, st.player.z, c.x, c.z);
      if (d < bd) { bd = d; best = c; }
    });
    if (best) {
      var r = S.Police.hitCruiser(best);
      if (r === 'disabled') return { ok: true, hit: 'cruiser disabled', ammo: st.ammo };
      return { ok: true, hit: 'cruiser hit', cruiserHp: r, ammo: st.ammo };
    }
    // Nearest pedestrian in range (fists only, raises wanted).
    if (w.id === 'fists') {
      var ped = null, pd = w.range;
      (S.Entities.peds || []).forEach(function (p) {
        if (!p.alive) return;
        var d = S.dist2d(st.player.x, st.player.z, p.x, p.z);
        if (d < pd) { pd = d; ped = p; }
      });
      if (ped) { ped.alive = false; S.Police.addWanted(1, 'assault'); return { ok: true, hit: 'pedestrian', ammo: st.ammo }; }
    }
    return { ok: true, hit: 'miss', ammo: st.ammo };
  };
  // Walk over a stash to refill ammo.
  W.checkStash = function () {
    var st = S.state;
    var got = 0;
    (S.World.stashes || []).forEach(function (s) {
      if (!s.taken && S.dist2d(st.player.x, st.player.z, s.x, s.z) < 4) {
        s.taken = true; st.ammo += 24; got += 24;
        if (S.Audio) S.Audio.pickup();
      }
    });
    return got;
  };
})(typeof window !== 'undefined' ? window : globalThis);
