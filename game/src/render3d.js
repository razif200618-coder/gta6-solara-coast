// render3d.js — draws the whole scene each frame with the WebGL engine:
// sunset sky, sea + animated waves, beach, roads, buildings, palms, cars,
// pedestrians, police, helicopter, mission marker. 2D fallback if no WebGL.
(function (root) {
  var S = root.Solara || (root.Solara = {});
  var R = S.Render = { fallback2d: false };
  var SKY = [0.98, 0.55, 0.35]; // sunset orange

  function drawCar(x, z, angle, color, isCop) {
    var E = S.Engine;
    E.drawBox(x, 0.7, z, 2.0, 0.9, 4.2, color, null, angle);
    E.drawBox(x, 1.5, z - 0.2, 1.7, 0.7, 2.2, '#1d2b3a', null, angle);
    if (isCop) {
      E.drawBox(x, 2.0, z - 0.2, 1.0, 0.25, 1.2, '#ff4040', null, angle);
      E.drawBox(x, 2.0, z + 0.6, 1.0, 0.25, 0.6, '#4aa3ff', null, angle);
    }
  }
  function drawPerson(x, z, color) {
    var E = S.Engine;
    E.drawBox(x, 0.9, z, 0.6, 1.8, 0.6, color, null, 0);
    E.drawBox(x, 1.95, z, 0.45, 0.45, 0.45, '#e8b98a', null, 0);
  }

  R.render = function (canvas, t) {
    var E = S.Engine;
    if (!E.ready) {
      if (!E.init(canvas)) { R.fallback2d = true; R.render2d(canvas, t); return; }
    }
    var w = canvas.width, h = canvas.height;
    var st = S.state, p = st.player;
    // Chase camera behind the player / car (raised so nearby facades don't fill the frame).
    var camDist = p.inCar ? 16 : 11, camH = p.inCar ? 7 : 5.5;
    var bx = p.x - Math.sin(p.angle) * camDist, bz = p.z - Math.cos(p.angle) * camDist;
    var eye = [bx, camH, bz], target = [p.x + Math.sin(p.angle) * 6, 1.5, p.z + Math.cos(p.angle) * 6];
    var proj = E.mat4Perspective(1.1, w / h, 0.1, 900);
    var view = E.mat4LookAt(eye, target, [0, 1, 0]);
    E.beginFrame(w, h, proj, view, SKY);
    var i;
    // Sea (west) + beach + ground.
    E.drawBox(-260, -0.4, 0, 110, 0.8, 440, '#1f6fb8', null, 0);
    // Animated waves: bright strips rolling toward the beach.
    for (i = 0; i < 5; i++) {
      var wz = ((t * 6 + i * 80) % 400) - 200;
      E.drawBox(-195 + Math.sin(t + i) * 2, 0.05, wz, 3, 0.1, 60, '#bfe8ff', null, 0);
    }
    E.drawBox(-165, -0.3, 0, 60, 0.6, 440, '#e8c98a', null, 0);
    E.drawBox(0, -0.5, 0, 440, 0.8, 440, '#5d7a4a', null, 0);
    // Roads.
    (S.World.roads || []).forEach(function (r) {
      var cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
      E.drawBox(cx, 0.02, cz, r.x1 - r.x0, 0.1, r.z1 - r.z0, '#2b2f36', null, 0);
    });
    // Lane dashes + crosswalks at intersections.
    for (i = -180; i <= 180; i += 60) {
      for (var k = -190; k <= 190; k += 16) {
        E.drawBox(i, 0.08, k, 0.4, 0.05, 3, '#f5d76e', null, 0);
        E.drawBox(k, 0.08, i, 3, 0.05, 0.4, '#f5d76e', null, 0);
      }
    }
    // Sunset sun + glow.
    E.drawBox(-240, 55, -180, 26, 26, 1, '#ffd76e', null, 0);
    E.drawBox(-240, 55, -180, 40, 40, 0.5, '#ff9a5e', null, 0);
    // Clouds.
    for (i = 0; i < 6; i++) {
      var cx2 = -160 + i * 70 + Math.sin(t * 0.05 + i) * 8;
      E.drawBox(cx2, 60 + (i % 3) * 8, -160 - (i % 2) * 40, 34, 5, 10, '#ffe8d8', null, 0);
    }
    // Buildings.
    (S.World.buildings || []).forEach(function (b) {
      E.drawBox(b.x, b.h / 2, b.z, b.w, b.h, b.d, b.color, b.tex, 0);
    });
    // Rooftop props.
    (S.World.props || []).forEach(function (pr) {
      if (pr.kind === 'ac') E.drawBox(pr.x, pr.y + 0.6, pr.z, 2.2, 1.2, 2.2, '#9aa5ad', null, 0);
      else if (pr.kind === 'antenna') E.drawBox(pr.x, pr.y + 3, pr.z, 0.3, 6, 0.3, '#333', null, 0);
      else if (pr.kind === 'umbrella') {
        E.drawBox(pr.x, 1.4, pr.z, 0.15, 2.8, 0.15, '#eee', null, 0);
        E.drawBox(pr.x, 2.9, pr.z, 4, 0.4, 4, pr.color, null, 0);
      }
    });
    // Neon signs (bright boxes on facades).
    (S.World.signs || []).forEach(function (sg) {
      E.drawBox(sg.x, sg.y, sg.z, 10, 2.2, 0.5, '#ff5e8a', null, 0);
    });
    // Palms: trunk + fronds.
    (S.World.palms || []).forEach(function (pl) {
      E.drawBox(pl.x, pl.h / 2, pl.z, 0.5, pl.h, 0.5, '#7a5230', null, 0);
      E.drawBox(pl.x, pl.h + 0.5, pl.z, 4.5, 0.5, 4.5, '#2e8b57', null, 0);
    });
    // Street lamps + traffic lights.
    (S.World.lamps || []).forEach(function (l) {
      E.drawBox(l.x, 2.5, l.z, 0.25, 5, 0.25, '#222', null, 0);
      E.drawBox(l.x, 5.1, l.z, 1.2, 0.5, 0.5, '#ffe9a8', null, 0);
    });
    (S.World.lights || []).forEach(function (l) {
      var col = S.World.lightState(t, l.phase) === 'green' ? '#2ecc71' : S.World.lightState(t, l.phase) === 'amber' ? '#f1c40f' : '#e74c3c';
      E.drawBox(l.x, 3, l.z, 0.6, 2.4, 0.6, '#111', null, 0);
      E.drawBox(l.x, 3.6, l.z, 0.5, 0.5, 0.5, col, null, 0);
    });
    // Ammo stashes.
    (S.World.stashes || []).forEach(function (s) {
      if (!s.taken) E.drawBox(s.x, 0.6, s.z, 1.4, 1.2, 1.4, '#27ae60', null, 0);
    });
    // Garage + race markers.
    E.drawBox(S.Activities.GARAGE.x, 1, S.Activities.GARAGE.z, 8, 2, 8, '#2ec4b6', null, 0);
    E.drawBox(S.Activities.RACE_START.x, 1, S.Activities.RACE_START.z, 6, 2, 6, '#ff5e8a', null, 0);
    // Mission target beacon.
    if (st.mission) {
      var pulse = 1 + Math.sin(t * 4) * 0.3;
      E.drawBox(st.mission.target.x, 3 * pulse, st.mission.target.z, 2, 6 * pulse, 2, '#ffd23f', null, 0);
    }
    // Race checkpoint.
    if (st.race && st.race.active) {
      var cp = st.race.checkpoints[st.race.cp];
      if (cp) E.drawBox(cp.x, 3, cp.z, 3, 6, 3, '#ff9f1c', null, 0);
    }
    // Roadblock at 3+ stars: striped barriers across the road ahead.
    if (st.roadblock) {
      for (i = -1; i <= 1; i++) {
        E.drawBox(p.x + Math.sin(p.angle) * 30 + i * 4, 0.8, p.z + Math.cos(p.angle) * 30, 3, 1.6, 1, i % 2 ? '#ff4040' : '#fff', null, p.angle);
      }
    }
    // Parked cars, traffic, player car.
    (S.World.cars || []).forEach(function (c) { drawCar(c.x, c.z, c.angle, c.color, false); });
    (S.Entities.traffic || []).forEach(function (c) { drawCar(c.x, c.z, c.angle, c.color, false); });
    if (st.car) drawCar(st.car.x, st.car.z, st.car.angle, st.car.color || '#c0392b', false);
    // Police cruisers + helicopter with searchlight.
    (S.Police.cruisers || []).forEach(function (c) {
      if (c.hp > 0) drawCar(c.x, c.z, c.angle, '#1c2733', true);
    });
    if (S.Police.heli) {
      var hh = S.Police.heli;
      E.drawBox(hh.x, hh.y, hh.z, 4, 2, 7, '#222', null, hh.angle);
      E.drawBox(hh.x, hh.y - 6, hh.z, 1.5, 10, 1.5, '#fff8c0', null, 0);
    }
    // Pedestrians + birds.
    (S.Entities.peds || []).forEach(function (pd) { if (pd.alive) drawPerson(pd.x, pd.z, pd.color); });
    (S.Entities.birds || []).forEach(function (b) {
      E.drawBox(b.x, b.y, b.z, 1.2, 0.2, 0.4, '#222', null, b.phase);
    });
    // Player on foot.
    if (!p.inCar) drawPerson(p.x, p.z, '#ff5e3a');
  };
  // 2D fallback: top-down city view so the game still shows something.
  R.render2d = function (canvas, t) {
    if (!canvas || !canvas.getContext) return;
    var g = canvas.getContext('2d');
    if (!g) return;
    var W = canvas.width, H = canvas.height;
    var grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#ff9a5e'); grad.addColorStop(0.5, '#ffb26e'); grad.addColorStop(1, '#7a4a6a');
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1f6fb8'; g.fillRect(0, 0, W * 0.15, H);
    g.fillStyle = '#e8c98a'; g.fillRect(W * 0.15, 0, W * 0.05, H);
    g.fillStyle = '#5d7a4a'; g.fillRect(W * 0.2, 0, W * 0.8, H);
    g.strokeStyle = '#2b2f36'; g.lineWidth = 6;
    for (var i = 0; i < 7; i++) {
      var p = W * 0.2 + i / 6 * W * 0.75;
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, H); g.stroke();
      var q = i / 6 * H;
      g.beginPath(); g.moveTo(W * 0.2, q); g.lineTo(W, q); g.stroke();
    }
    g.fillStyle = '#ffd76e'; g.beginPath(); g.arc(W * 0.82, H * 0.2, 40, 0, 6.29); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center';
    g.fillText('SOLARA HEAT', W / 2, H / 2 - 10);
    g.font = '18px sans-serif';
    g.fillText('Solara Coast — drive, race, outrun the PD', W / 2, H / 2 + 24);
    var st = S.state;
    g.fillStyle = '#fff';
    g.fillText('$' + st.cash + '  •  ' + S.HUD.stars(st.wanted) + '  •  ' + S.Missions.objectiveText(), W / 2, H - 30);
  };
})(typeof window !== 'undefined' ? window : globalThis);
