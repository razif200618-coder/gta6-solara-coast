// entities.js — traffic cars, pedestrians, parked cars, birds, waves.
(function (root) {
  var S = root.Solara || (root.Solara = {});
  var E = S.Entities = { traffic: [], peds: [], birds: [], waveT: 0 };
  var CAR_COLORS = ['#c0392b', '#2980b9', '#f1c40f', '#ecf0f1', '#2c3e50', '#e67e22', '#8e44ad', '#16a085'];
  var PED_COLORS = ['#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1'];

  E.spawn = function () {
    var rand = S.rng(777);
    E.traffic = []; E.peds = []; E.birds = [];
    for (var i = 0; i < S.CONFIG.maxTraffic; i++) {
      var vertical = rand() < 0.5;
      E.traffic.push({
        id: 't' + i, x: -180 + rand() * 360, z: -180 + rand() * 360,
        angle: vertical ? (rand() < 0.5 ? 0 : Math.PI) : (rand() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
        speed: 6 + rand() * 6, color: CAR_COLORS[i % CAR_COLORS.length], hp: 100, stopped: false
      });
    }
    for (var j = 0; j < S.CONFIG.maxPeds; j++) {
      E.peds.push({
        id: 'p' + j, x: -170 + rand() * 340, z: -170 + rand() * 340,
        angle: rand() * Math.PI * 2, speed: 1 + rand() * 1.2,
        color: PED_COLORS[j % PED_COLORS.length], alive: true
      });
    }
    for (var k = 0; k < 12; k++) {
      E.birds.push({ x: -150 + rand() * 300, y: 28 + rand() * 14, z: -150 + rand() * 300, phase: rand() * 6.28, speed: 3 + rand() * 3 });
    }
    return E;
  };
  E.update = function (dt, t) {
    E.waveT = t;
    var i, c;
    for (i = 0; i < E.traffic.length; i++) {
      c = E.traffic[i];
      if (c.stopped) continue;
      c.x += Math.sin(c.angle) * c.speed * dt;
      c.z += Math.cos(c.angle) * c.speed * dt;
      if (c.x > 205) c.x = -205; if (c.x < -205) c.x = 205;
      if (c.z > 205) c.z = -205; if (c.z < -205) c.z = 205;
    }
    for (i = 0; i < E.peds.length; i++) {
      var p = E.peds[i];
      if (!p.alive) continue;
      p.x += Math.sin(p.angle) * p.speed * dt;
      p.z += Math.cos(p.angle) * p.speed * dt;
      if (p.x > 200 || p.x < -200 || p.z > 200 || p.z < -200) p.angle += Math.PI / 2;
      if (Math.random() < 0.001) p.angle += (Math.random() - 0.5) * 2;
    }
    for (i = 0; i < E.birds.length; i++) {
      var b = E.birds[i];
      b.x += Math.sin(b.phase) * b.speed * dt;
      b.z += Math.cos(b.phase * 0.7) * b.speed * dt;
      if (b.x > 210) b.x = -210; if (b.z > 210) b.z = -210;
    }
  };
  // Nearest driveable car within range (traffic or parked).
  E.nearestCar = function (x, z, maxD) {
    var best = null, bd = maxD || 6;
    var all = E.traffic.concat(S.World.cars || []);
    for (var i = 0; i < all.length; i++) {
      var d = S.dist2d(x, z, all[i].x, all[i].z);
      if (d < bd) { bd = d; best = all[i]; }
    }
    return best;
  };
  E.counts = function () {
    return { traffic: E.traffic.length, peds: E.peds.filter(function (p) { return p.alive; }).length, birds: E.birds.length };
  };
})(typeof window !== 'undefined' ? window : globalThis);
