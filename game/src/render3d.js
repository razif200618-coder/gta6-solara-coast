// render3d.js — draws Solara Coast in 3D with the hand-written WebGL engine.
// The world logic is still the 2D x/y grid; world y becomes 3D z, and a 2D
// angle a becomes a heading (cos a, 0, sin a). Third-person chase camera
// follows the player, Q/E or mouse-drag orbits around them.
(function (global) {
  'use strict';
  const W = global.SolaraWorld, CFG = global.SolaraConfig, GL = global.SolaraGL3D;

  // Smoothed camera state.
  const cam = { x: 0, y: 90, z: 0, heading: 0, dist: 150, init: false };
  let menuAngle = 0;

  function headingOf(angle) { return angle; } // 2D angle IS the 3D heading.

  function drawCar3D(x, z, angle, color, isPolice, time) {
    // Body: length along heading. Car forward is +X when ry = -angle.
    const ry = -angle;
    const fx = Math.cos(angle), fz = Math.sin(angle);
    const rx = -Math.sin(angle), rz = Math.cos(angle); // right vector
    GL.box(x, 5, z, 38, 9, 19, ry, color);
    GL.box(x + fx * 2, 11, z + fz * 2, 20, 7, 17, ry, isPolice ? '#dfe8f2' : '#1d2733');
    // Wheels.
    for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) {
      GL.box(x + fx * s1 * 12 + rx * s2 * 10, 3.5, z + fz * s1 * 12 + rz * s2 * 10, 7, 7, 4, ry, '#141414');
    }
    // Headlights / tail lights.
    GL.box(x + fx * 19, 5, z + fz * 19, 1.5, 3, 14, ry, '#ffe9a0', { unlit: true });
    GL.box(x - fx * 19, 5, z - fz * 19, 1.5, 3, 14, ry, '#ff3b30', { unlit: true });
    if (isPolice) {
      const flash = Math.floor(time * 6) % 2 === 0;
      GL.box(x + fx * 2 - rx * 4, 15.5, z + fz * 2 - rz * 4, 7, 3, 4, ry, flash ? '#ff3b30' : '#3b82ff', { unlit: true });
      GL.box(x + fx * 2 + rx * 4, 15.5, z + fz * 2 + rz * 4, 7, 3, 4, ry, flash ? '#3b82ff' : '#ff3b30', { unlit: true });
    }
  }

  function drawPerson3D(x, z, angle, color, time, walkPhase, scale) {
    scale = scale || 1;
    const ry = -angle;
    const bob = Math.sin(walkPhase || 0) * 0.8;
    GL.box(x, 10 * scale + bob, z, 11 * scale, 18 * scale, 8 * scale, ry, color);
    GL.box(x, 22 * scale + bob, z, 8 * scale, 8 * scale, 8 * scale, ry, '#f2c89b');
    // Legs (two small boxes that swing while walking).
    const sw = Math.sin(walkPhase || 0) * 4;
    const fx = Math.cos(angle), fz = Math.sin(angle);
    GL.box(x + fx * sw, 3 * scale, z + fz * sw, 4 * scale, 7 * scale, 3.5 * scale, ry, '#222831');
    GL.box(x - fx * sw, 3 * scale, z - fz * sw, 4 * scale, 7 * scale, 3.5 * scale, ry, '#222831');
  }

  function drawWorld3D(game, menuMode) {
    const pl = game.player;
    const time = game.time;
    const driving = !pl.onFoot && pl.car;

    // ---- camera ----
    let targetHeading, eye, look;
    if (menuMode) {
      menuAngle += 0.0006;
      const cx = 1300, cz = 950;
      eye = [cx + Math.cos(menuAngle) * 900, 420, cz + Math.sin(menuAngle) * 900];
      look = [cx, 0, cz];
      game.camHeading = Math.atan2(look[2] - eye[2], look[0] - eye[0]);
    } else {
      const orbit = (global.SolaraInput && global.SolaraInput.orbit) || 0;
      targetHeading = headingOf(pl.angle) + orbit;
      if (!cam.init) { cam.heading = targetHeading; cam.x = pl.x; cam.z = pl.y; cam.init = true; }
      // Smooth heading (shortest turn).
      let dh = targetHeading - cam.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      cam.heading += dh * 0.08;
      cam.dist += ((driving ? 170 : 115) - cam.dist) * 0.05;
      const cx = pl.x, cz = pl.y;
      cam.x += (cx - cam.x) * 0.12; cam.z += (cz - cam.z) * 0.12;
      const ch = cam.heading;
      const dist = cam.dist, h = driving ? 115 : 70;
      eye = [cam.x - Math.cos(ch) * dist, h, cam.z - Math.sin(ch) * dist];
      look = [cam.x + Math.cos(ch) * 60, 14, cam.z + Math.sin(ch) * 60];
      game.camHeading = ch;
    }
    GL.beginFrame(eye, look, [0, 1, 0]);

    const C = CFG.COLORS;
    // ---- ground: grass, park, beach, sea ----
    GL.box(1300, -1, 950, 2600, 2, 1900, 0, C.grass);
    GL.box(W.park.x + W.park.w / 2, 0.5, W.park.y + W.park.h / 2, W.park.w, 3, W.park.h, 0, C.grass2);
    GL.box(1300, 0.5, (W.beachY + W.seaY) / 2, 2600, 3, W.seaY - W.beachY, 0, C.sand);
    GL.box(1300, 0.2, (W.seaY + CFG.WORLD_H) / 2, 2600, 2, CFG.WORLD_H - W.seaY, 0, C.sea);
    // Sun glare strip on the sea.
    GL.box(1300, 1, 1830, 500, 1, 26, 0, '#bfe3f5', { unlit: true, alpha: 0.8 });
    // ---- roads + sidewalks + centre lines ----
    for (const rx of W.roadsV) {
      GL.box(rx, 1.2, 950, CFG.ROAD_W, 2.4, 1900, 0, C.road);
      GL.box(rx - CFG.ROAD_W / 2 - 6, 1.0, 950, 10, 2, 1900, 0, C.sidewalk);
      GL.box(rx + CFG.ROAD_W / 2 + 6, 1.0, 950, 10, 2, 1900, 0, C.sidewalk);
      GL.box(rx, 2.5, 950, 4, 0.6, 1900, 0, C.roadLine, { unlit: true });
    }
    for (const ry of W.roadsH) {
      GL.box(1300, 1.2, ry, 2600, 2.4, CFG.ROAD_W, 0, C.road);
      GL.box(1300, 1.0, ry - CFG.ROAD_W / 2 - 6, 2600, 2, 10, 0, C.sidewalk);
      GL.box(1300, 1.0, ry + CFG.ROAD_W / 2 + 6, 2600, 2, 10, 0, C.sidewalk);
      GL.box(1300, 2.5, ry, 2600, 0.6, 4, 0, C.roadLine, { unlit: true });
    }
    // ---- park trees (never on a road or inside a building) ----
    for (let i = 0; i < 10; i++) {
      const tx = W.park.x + 60 + (i % 5) * 130, tz = W.park.y + 70 + Math.floor(i / 5) * 240;
      if (W.onRoad(tx, tz) || W.hitBuilding(tx, tz, 20)) continue;
      GL.box(tx, 12, tz, 7, 24, 7, 0, '#6b4a2b');
      GL.box(tx, 34, tz, 30, 24, 30, 0, i % 2 ? '#3f7d3a' : '#5d9c4a');
    }
    // ---- beach palms along the sand (off the roads) ----
    for (let i = 0; i < 8; i++) {
      const tx = 260 + i * 300, tz = 1705;
      if (W.onRoad(tx, tz)) continue;
      GL.box(tx, 12, tz, 6, 24, 6, 0, '#6b4a2b');
      GL.box(tx, 30, tz, 30, 18, 30, 0, '#4f9c4a');
    }
    // ---- buildings (windows only when near the camera) ----
    for (const b of W.buildings) {
      const cx = b.x + b.w / 2, cz = b.y + b.h / 2;
      const h = b.hgt * 2.2;
      GL.box(cx, h / 2, cz, b.w, h, b.h, 0, b.color);
      GL.box(cx, h + 2, cz, b.w + 4, 4, b.h + 4, 0, b.roof);
      const dCam = Math.hypot(cx - eye[0], cz - eye[2]);
      if (dCam < 620) {
        // Window band on the south face.
        for (let wx = b.x + 14; wx < b.x + b.w - 10; wx += 26) {
          GL.box(wx, h * 0.62, b.y + b.h + 0.6, 12, 12, 1.2, 0, '#ffe9a0', { unlit: true, alpha: 0.9 });
        }
      }
    }
    // ---- roadblocks ----
    for (const rb of game.police.roadblocks) {
      GL.box(rb.x, 6, rb.y, 64, 10, 8, 0, '#ff7a1a');
      GL.box(rb.x, 6, rb.y, 64, 3, 8.5, 0, '#ffffff');
    }
    // ---- mission target beam + ring ----
    const tgt = game.missionTarget;
    if (tgt) {
      const pulse = 1 + Math.sin(time * 4) * 0.12;
      GL.box(tgt.x, 70, tgt.y, 7, 140, 7, 0, '#ffd94d', { unlit: true, alpha: 0.85 });
      const r = 34 * pulse;
      GL.box(tgt.x - r, 2, tgt.y, 4, 1.5, r * 2, 0, '#ffd94d', { unlit: true });
      GL.box(tgt.x + r, 2, tgt.y, 4, 1.5, r * 2, 0, '#ffd94d', { unlit: true });
      GL.box(tgt.x, 2, tgt.y - r, r * 2, 1.5, 4, 0, '#ffd94d', { unlit: true });
      GL.box(tgt.x, 2, tgt.y + r, r * 2, 1.5, 4, 0, '#ffd94d', { unlit: true });
    }
    // ---- collect crates (mission 5) ----
    const m = game.missions.active;
    if (m && m.type === 'collect') {
      m.crates.forEach(function (cr, i) {
        if (i < game.missions.collected) return;
        GL.box(cr.x, 8, cr.y, 16, 16, 16, time * 0.4, '#c98a2e');
        GL.box(cr.x, 8, cr.y, 17, 4, 17, time * 0.4, '#7a5220');
      });
    }
    // ---- cars: traffic, parked, police, player ----
    for (const c of game.traffic) drawCar3D(c.x, c.y, c.angle, c.color, false, time);
    for (const c of game.parked) drawCar3D(c.x, c.y, c.angle, c.color, false, time);
    for (const c of game.police.cars) drawCar3D(c.x, c.y, c.angle, c.color, true, time);
    // ---- pedestrians ----
    for (const p of game.peds) {
      drawPerson3D(p.x, p.y, p.angle, p.color, time, time * 6 + p.x);
      // Blob shadow.
      GL.box(p.x, 0.6, p.y, 14, 0.8, 14, 0, '#000000', { alpha: 0.22 });
    }
    // ---- player ----
    if (!pl.onFoot) {
      const car = pl.car;
      if (car) {
        drawCar3D(car.x, car.y, car.angle, car.color, false, time);
        GL.box(car.x, 0.6, car.y, 46, 0.8, 26, -car.angle, '#000000', { alpha: 0.25 });
      }
    } else {
      drawPerson3D(pl.x, pl.y, pl.angle, pl.color, time, time * 7, 1.5);
      GL.box(pl.x, 0.6, pl.y, 22, 0.8, 22, 0, '#000000', { alpha: 0.25 });
      if (pl.punchTimer > 0.25) {
        GL.box(pl.x + Math.cos(pl.angle) * 22, 12, pl.y + Math.sin(pl.angle) * 22, 10, 10, 10, -pl.angle, '#ffffff', { unlit: true });
      }
    }
    // ---- helicopter ----
    if (game.police.heli) {
      const h = game.police.heli;
      const hy = 150;
      GL.box(h.x, hy, h.y, 34, 14, 16, -Math.atan2(pl.y - h.y, pl.x - h.x), '#1c2f4a');
      GL.box(h.x - 22, hy + 2, h.y, 26, 6, 6, -Math.atan2(pl.y - h.y, pl.x - h.x), '#1c2f4a');
      GL.box(h.x, hy + 10, h.y, 56, 2, 4, time * 9, '#222831');
      // Searchlight pool on the ground.
      GL.box(pl.x, 1.5, pl.y, 110, 1, 110, 0, '#fff6b0', { unlit: true, alpha: 0.28 });
    }
    // ---- sky: sun + clouds (drawn last, far away, unlit) ----
    const ex = eye[0], ez = eye[2];
    GL.box(ex + 900, 420, ez - 1100, 150, 150, 10, 0, '#fff3b0', { unlit: true });
    for (let i = 0; i < 5; i++) {
      const cx2 = ex + ((i * 613) % 1400) - 700;
      const cz2 = ez - 800 + ((i * 377) % 500);
      GL.box(cx2, 300 + (i % 3) * 40, cz2, 220, 26, 90, 0, '#ffffff', { unlit: true, alpha: 0.92 });
    }
  }

  global.SolaraRender3D = { drawWorld3D, drawCar3D, drawPerson3D };
})(window);
