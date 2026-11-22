// hud.js — DOM HUD: cash, respect, rank bar, wanted stars, ammo, car HP,
// mission objective, district, radio; live 2D minimap; menu/pause/busted screens.
(function (root) {
  var S = root.Solara || (root.Solara = {});
  var H = S.HUD = {};
  H.el = function (id) {
    if (typeof document === 'undefined') return null;
    return document.getElementById(id);
  };
  H.stars = function (n) {
    var s = '';
    for (var i = 0; i < 5; i++) s += i < n ? '★' : '☆';
    return s;
  };
  H.update = function () {
    var st = S.state;
    function set(id, txt) { var e = H.el(id); if (e) e.textContent = txt; }
    set('hud-cash', '$' + st.cash);
    set('hud-respect', 'Respect ' + st.respect);
    var rank = S.rankFor(st.respect), next = S.nextRank(st.respect);
    set('hud-rank', rank.name);
    var pct = next ? Math.round(100 * (st.respect - rank.respect) / (next.respect - rank.respect)) : 100;
    var bar = H.el('hud-rankbar'); if (bar) bar.style.width = pct + '%';
    set('hud-wanted', H.stars(st.wanted));
    var w = H.el('hud-wanted'); if (w) w.className = 'stars' + (st.wanted >= 3 ? ' hot' : '');
    set('hud-ammo', S.Weapons.current().name + '  •  Ammo ' + (S.state.weapon === 'fists' ? '∞' : st.ammo));
    set('hud-carhp', 'Car ' + Math.round(st.carHp) + '%');
    var cb = H.el('hud-carbar'); if (cb) cb.style.width = Math.round(st.carHp) + '%';
    set('hud-objective', S.Missions.objectiveText());
    set('hud-district', S.districtAt(st.player.x, st.player.z));
    set('hud-radio', S.Activities.station());
    set('hud-speed', st.player.inCar ? Math.round(Math.abs(st.player.speed || 0) * 3.6) + ' km/h' : 'On foot');
    H.drawMinimap();
    var busted = H.el('busted-screen');
    if (busted) busted.style.display = st.busted ? 'flex' : 'none';
    var br = H.el('busted-reason'); if (br && st.bustReason) br.textContent = st.bustReason;
    var menu = H.el('menu-screen');
    if (menu) menu.style.display = st.started ? 'none' : 'flex';
    var pause = H.el('pause-screen');
    if (pause) pause.style.display = (st.started && st.paused && !st.busted) ? 'flex' : 'none';
  };
  H.drawMinimap = function () {
    var cv = H.el('minimap');
    if (!cv || !cv.getContext) return;
    var g = cv.getContext('2d'), W = cv.width, Hh = cv.height;
    g.clearRect(0, 0, W, Hh);
    g.fillStyle = '#0e2a3a'; g.fillRect(0, 0, W, Hh);
    // Beach + sea strip on the west edge.
    g.fillStyle = '#2e7fb8'; g.fillRect(0, 0, W * 0.08, Hh);
    g.fillStyle = '#e8c98a'; g.fillRect(W * 0.08, 0, W * 0.06, Hh);
    // Roads.
    g.strokeStyle = '#3a4a5a'; g.lineWidth = 2;
    for (var i = 0; i < 7; i++) {
      var p = (i + 0.5) / 7 * W;
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, Hh); g.stroke();
      g.beginPath(); g.moveTo(0, p); g.lineTo(W, p); g.stroke();
    }
    function dot(x, z, color, r) {
      g.fillStyle = color;
      g.beginPath(); g.arc((x + 210) / 420 * W, (z + 210) / 420 * Hh, r, 0, 6.29); g.fill();
    }
    // Mission target.
    if (S.state.mission) dot(S.state.mission.target.x, S.state.mission.target.z, '#ffd23f', 5);
    // Garage + race markers.
    dot(S.Activities.GARAGE.x, S.Activities.GARAGE.z, '#2ec4b6', 3);
    dot(S.Activities.RACE_START.x, S.Activities.RACE_START.z, '#ff5e8a', 3);
    // Police.
    (S.Police.cruisers || []).forEach(function (c) { if (c.hp > 0) dot(c.x, c.z, '#4aa3ff', 3); });
    if (S.Police.heli) dot(S.Police.heli.x, S.Police.heli.z, '#ff4040', 4);
    // Player arrow.
    var px = (S.state.player.x + 210) / 420 * W, py = (S.state.player.z + 210) / 420 * Hh;
    g.save(); g.translate(px, py); g.rotate(-S.state.player.angle);
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -6); g.lineTo(4, 5); g.lineTo(-4, 5); g.closePath(); g.fill();
    g.restore();
  };
  H.showToast = function (msg) {
    var e = H.el('toast');
    if (!e) return;
    e.textContent = msg; e.style.opacity = '1';
    setTimeout(function () { e.style.opacity = '0'; }, 2600);
  };
})(typeof window !== 'undefined' ? window : globalThis);
