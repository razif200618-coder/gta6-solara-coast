// render3d.js — draws Solara Coast in 3D with the hand-written WebGL engine.
// The world logic is still the 2D x/y grid; world y becomes 3D z, and a 2D
// angle a becomes a heading (cos a, 0, sin a). Third-person chase camera
// follows the player, Q/E or mouse-drag orbits around them.
// Visual richness: runtime-textured facades (window grids, some lit),
// neon signs with invented business names, balconies, rooftop props,
// crosswalks, dashed lane lines, street lamps, traffic lights, palm-lined
// boulevard, beach umbrellas, waves, birds, warm sunset light.
(function (global) {
  'use strict';
  const W = global.SolaraWorld, CFG = global.SolaraConfig, GL = global.SolaraGL3D;

  // Smoothed camera state.
  const cam = { x: 0, y: 90, z: 0, heading: 0, dist: 150, init: false };
  let menuAngle = 0;

  function headingOf(angle) { return angle; } // 2D angle IS the 3D heading.

  function drawCar3D(x, z, angle, color, isPolice, time, opts) {
    opts = opts || {};
    const ry = -angle;
    const fx = Math.cos(angle), fz = Math.sin(angle);
    const rx = -Math.sin(angle), rz = Math.cos(angle); // right vector
    // Blob shadow under the car.
    GL.box(x, 0.6, z, 46, 0.8, 26, ry, '#000000', { alpha: 0.22 });
    // Body + hood/trunk shaping: main body, lower skirt, cabin.
    GL.box(x, 5, z, 38, 9, 19, ry, color);
    GL.box(x, 2.5, z, 40, 3, 20, ry, GL.shade(color, 0.55));
    GL.box(x + fx * 2, 11, z + fz * 2, 20, 7, 17, ry, isPolice ? '#dfe8f2' : '#1d2733');
    // Front grille + bumper.
    GL.box(x + fx * 19.5, 4, z + fz * 19.5, 1.5, 4, 16, ry, '#222831');
    GL.box(x - fx * 19.5, 4, z - fz * 19.5, 1.5, 4, 16, ry, GL.shade(color, 0.6));
    // Spoiler on sporty cars.
    if (!isPolice && (color === '#d94f3d' || color === '#e8c33d' || color === '#c65aad')) {
      GL.box(x - fx * 17, 10, z - fz * 17, 2, 1.5, 18, ry, '#141414');
      GL.box(x - fx * 18, 12, z - fz * 18, 1, 1.5, 16, ry, '#141414');
    }
    // Side mirrors.
    GL.box(x + fx * 8 + rx * 10.5, 9, z + fz * 8 + rz * 10.5, 3, 2, 2, ry, '#141414');
    GL.box(x + fx * 8 - rx * 10.5, 9, z + fz * 8 - rz * 10.5, 3, 2, 2, ry, '#141414');
    // Wheels with lighter hubs.
    for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) {
      GL.box(x + fx * s1 * 12 + rx * s2 * 10, 3.5, z + fz * s1 * 12 + rz * s2 * 10, 7, 7, 4, ry, '#141414');
      GL.box(x + fx * s1 * 12 + rx * s2 * 11, 3.5, z + fz * s1 * 12 + rz * s2 * 11, 2, 3, 4.5, ry, '#9aa5b1');
    }
    // Headlights / tail lights.
    GL.box(x + fx * 19, 5, z + fz * 19, 1.5, 3, 14, ry, '#ffe9a0', { unlit: true });
    GL.box(x - fx * 19, 5, z - fz * 19, 1.5, 3, 14, ry, '#ff3b30', { unlit: true });
    if (isPolice) {
      const flash = Math.floor(time * 6) % 2 === 0;
      GL.box(x + fx * 2 - rx * 4, 15.5, z + fz * 2 - rz * 4, 7, 3, 4, ry, flash ? '#ff3b30' : '#3b82ff', { unlit: true });
      GL.box(x + fx * 2 + rx * 4, 15.5, z + fz * 2 + rz * 4, 7, 3, 4, ry, flash ? '#3b82ff' : '#ff3b30', { unlit: true });
      // Push bar on the front.
      GL.box(x + fx * 20.5, 5, z + fz * 20.5, 1.5, 5, 12, ry, '#222831');
    }
    // Wreck smoke.
    if (opts.smoke) {
      const s = 1 + Math.sin(time * 3) * 0.2;
      GL.box(x, 24, z, 16 * s, 14 * s, 16 * s, 0, '#888888', { alpha: 0.5 });
    }
  }

  function drawPerson3D(x, z, angle, color, time, walkPhase, scale, opts) {
    scale = scale || 1;
    opts = opts || {};
    const ry = -angle;
    const bob = Math.sin(walkPhase || 0) * 0.8;
    GL.box(x, 0.6, z, 14 * scale, 0.8, 14 * scale, 0, '#000000', { alpha: 0.22 });
    // Legs (two small boxes that swing while walking).
    const sw = Math.sin(walkPhase || 0) * 4;
    const fx = Math.cos(angle), fz = Math.sin(angle);
    GL.box(x + fx * sw, 3 * scale, z + fz * sw, 4 * scale, 7 * scale, 3.5 * scale, ry, '#222831');
    GL.box(x - fx * sw, 3 * scale, z - fz * sw, 4 * scale, 7 * scale, 3.5 * scale, ry, '#2d3748');
    // Torso + arms (arms hang at the sides, swinging with the walk).
    GL.box(x, 10 * scale + bob, z, 11 * scale, 18 * scale, 8 * scale, ry, color);
    const asw = Math.sin(walkPhase || 0) * 3;
    const ax = -Math.sin(angle), az = Math.cos(angle); // right vector
    GL.box(x + ax * 7 * scale + fx * asw, 11 * scale + bob, z + az * 7 * scale + fz * asw, 3 * scale, 10 * scale, 3 * scale, ry, color);
    GL.box(x - ax * 7 * scale - fx * asw, 11 * scale + bob, z - az * 7 * scale - fz * asw, 3 * scale, 10 * scale, 3 * scale, ry, color);
    // Head (+ hat for some pedestrians).
    GL.box(x, 22 * scale + bob, z, 8 * scale, 8 * scale, 8 * scale, ry, '#f2c89b');
    if (opts.hat) GL.box(x, 26.5 * scale + bob, z, 11 * scale, 2.5 * scale, 11 * scale, ry, '#d94f3d');
  }

  function drawPalm(x, z, h, time) {
    GL.box(x, 0.6, z, 12, 0.8, 12, 0, '#000000', { alpha: 0.2 });
    GL.box(x, h / 2, z, 6, h, 6, 0, '#6b4a2b');
    // Fronds: four thin boxes angled down from the crown.
    const sway = Math.sin(time * 0.8 + x * 0.01) * 0.06;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.4;
      const fx = Math.cos(a), fz = Math.sin(a);
      GL.box(x + fx * 14, h + 2, z + fz * 14, 26, 1.5, 8, -a, '#4f9c4a', { rx: 0.5 + sway });
    }
    GL.box(x, h + 4, z, 10, 6, 10, 0, '#7a5a2e'); // coconuts
  }

  // Does building b block the view from eye to the player? If so, skip it.
  // Also skip buildings whose footprint is right under the camera eye.
  function blocksView(b, eye, px, pz) {
    const cx = b.x + b.w / 2, cz = b.y + b.h / 2;
    // Near-eye cull: a roof filling the foreground hides the player.
    const nx = Math.max(b.x, Math.min(eye[0], b.x + b.w));
    const nz = Math.max(b.y, Math.min(eye[2], b.y + b.h));
    if (Math.hypot(nx - eye[0], nz - eye[2]) < 80) return true;
    const dx = px - eye[0], dz = pz - eye[2];
    const len2 = dx * dx + dz * dz;
    if (len2 < 1) return false;
    let t = ((cx - eye[0]) * dx + (cz - eye[2]) * dz) / len2;
    if (t < 0.05 || t > 0.9) return false;
    const qx = eye[0] + dx * t, qz = eye[2] + dz * t;
    const d = Math.hypot(cx - qx, cz - qz);
    if (d > Math.hypot(b.w, b.h) / 2 + 20) return false;
    const hAtT = eye[1] + (14 - eye[1]) * t;
    return b.hgt * 2.2 > hAtT * 0.85;
  }

  function drawWorld3D(game, menuMode) {
    const pl = game.player;
    const time = game.time;
    const driving = !pl.onFoot && pl.car;

    // ---- camera ----
    let eye, look;
    if (menuMode) {
      menuAngle += 0.0006;
      const cx = 1300, cz = 950;
      eye = [cx + Math.cos(menuAngle) * 900, 420, cz + Math.sin(menuAngle) * 900];
      look = [cx, 0, cz];
      game.camHeading = Math.atan2(look[2] - eye[2], look[0] - eye[0]);
    } else {
      const orbit = (global.SolaraInput && global.SolaraInput.orbit) || 0;
      const targetHeading = headingOf(pl.angle) + orbit;
      if (!cam.init) { cam.heading = targetHeading; cam.x = pl.x; cam.z = pl.y; cam.init = true; }
      let dh = targetHeading - cam.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      cam.heading += dh * 0.08;
      cam.dist += ((driving ? 150 : 150) - cam.dist) * 0.05;
      const cx = pl.x, cz = pl.y;
      cam.x += (cx - cam.x) * 0.12; cam.z += (cz - cam.z) * 0.12;
      const ch = cam.heading;
      const dist = cam.dist, h = driving ? 105 : 95;
      eye = [cam.x - Math.cos(ch) * dist, h, cam.z - Math.sin(ch) * dist];
      look = [cam.x + Math.cos(ch) * 90, 12, cam.z + Math.sin(ch) * 90];
      game.camHeading = ch;
    }
    GL.beginFrame(eye, look, [0, 1, 0]);

    const C = CFG.COLORS;
    // ---- ground: grass, park, beach, sea ----
    GL.box(1300, -1, 950, 2600, 2, 1900, 0, C.grass);
    GL.box(W.park.x + W.park.w / 2, 0.5, W.park.y + W.park.h / 2, W.park.w, 3, W.park.h, 0, C.grass2);
    // Marina plaza (light paving near the garage/hotel).
    GL.box(2050, 0.6, 420, 420, 2, 320, 0, '#cbb98f');
    GL.box(1300, 0.5, (W.beachY + W.seaY) / 2, 2600, 3, W.seaY - W.beachY, 0, C.sand);
    GL.box(1300, 0.2, (W.seaY + CFG.WORLD_H) / 2, 2600, 2, CFG.WORLD_H - W.seaY, 0, C.sea);
    GL.box(1300, 0.4, (W.seaY + 30 + CFG.WORLD_H) / 2, 2600, 2, CFG.WORLD_H - (W.seaY + 30), 0, C.seaDeep);
    // Sun glare strip on the sea + animated wave lines.
    GL.box(1300, 1, 1830, 560, 1, 26, 0, '#bfe3f5', { unlit: true, alpha: 0.8 });
    for (let i = 0; i < 3; i++) {
      const wz = 1820 + i * 30;
      const wx = 1300 + Math.sin(time * 0.5 + i * 2) * 40;
      GL.box(wx, 1.2, wz, 700, 0.8, 3, 0, '#eaf7ff', { unlit: true, alpha: 0.55 });
    }
    // ---- roads + sidewalks + dashed centre lines (near camera only) ----
    for (const rx of W.roadsV) {
      GL.box(rx, 1.2, 950, CFG.ROAD_W, 2.4, 1900, 0, C.road);
      GL.box(rx - CFG.ROAD_W / 2 - 6, 1.0, 950, 10, 2, 1900, 0, C.sidewalk);
      GL.box(rx + CFG.ROAD_W / 2 + 6, 1.0, 950, 10, 2, 1900, 0, C.sidewalk);
      for (let z = Math.max(0, eye[2] - 520); z < Math.min(1900, eye[2] + 520); z += 64) {
        GL.box(rx, 2.5, z, 4, 0.6, 30, 0, C.roadLine, { unlit: true });
      }
    }
    for (const ry of W.roadsH) {
      GL.box(1300, 1.2, ry, 2600, 2.4, CFG.ROAD_W, 0, C.road);
      GL.box(1300, 1.0, ry - CFG.ROAD_W / 2 - 6, 2600, 2, 10, 0, C.sidewalk);
      GL.box(1300, 1.0, ry + CFG.ROAD_W / 2 + 6, 2600, 2, 10, 0, C.sidewalk);
      for (let x = Math.max(0, eye[0] - 520); x < Math.min(2600, eye[0] + 520); x += 64) {
        GL.box(x, 2.5, ry, 30, 0.6, 4, 0, C.roadLine, { unlit: true });
      }
    }
    // ---- crosswalks at intersections near the camera ----
    for (const rx of W.roadsV) for (const ry of W.roadsH) {
      if (Math.hypot(rx - eye[0], ry - eye[2]) > 480) continue;
      for (let i = -2; i <= 2; i++) {
        GL.box(rx + i * 13, 2.6, ry - CFG.ROAD_W / 2 - 4, 6, 0.5, 14, 0, '#f2f2f2', { unlit: true });
        GL.box(rx + i * 13, 2.6, ry + CFG.ROAD_W / 2 + 4, 6, 0.5, 14, 0, '#f2f2f2', { unlit: true });
      }
    }
    // ---- street lamps + traffic lights near the camera ----
    for (const l of W.lamps) {
      const dl = Math.hypot(l.x - eye[0], l.y - eye[2]);
      if (dl > 620 || dl < 160) continue;
      GL.box(l.x, 14, l.y, 3, 28, 3, 0, '#2d3748');
      GL.box(l.x, 28, l.y, 10, 3, 10, 0, '#ffe9a0', { unlit: true });
    }
    for (const tl of W.trafficLights) {
      const dtl = Math.hypot(tl.x - eye[0], tl.y - eye[2]);
      if (dtl > 620 || dtl < 160) continue;
      const green = Math.floor(time / 3 + tl.x / 320) % 2 === 0;
      GL.box(tl.x + 40, 16, tl.y - 40, 3, 32, 3, 0, '#2d3748');
      GL.box(tl.x + 40, 30, tl.y - 40, 8, 14, 8, 0, '#222831');
      GL.box(tl.x + 40, 32, tl.y - 40, 5, 5, 5, 0, green ? '#37d67a' : '#ff3b30', { unlit: true });
    }
    // ---- park trees + beach palms ----
    for (let i = 0; i < 10; i++) {
      const tx = W.park.x + 60 + (i % 5) * 130, tz = W.park.y + 70 + Math.floor(i / 5) * 240;
      if (W.onRoad(tx, tz) || W.hitBuilding(tx, tz, 20)) continue;
      GL.box(tx, 12, tz, 7, 24, 7, 0, '#6b4a2b');
      GL.box(tx, 34, tz, 30, 24, 30, 0, i % 2 ? '#3f7d3a' : '#5d9c4a');
    }
    for (const pm of W.palms) {
      if (Math.hypot(pm.x - eye[0], pm.y - eye[2]) > 900) continue;
      drawPalm(pm.x, pm.y, pm.h, time);
    }
    // ---- beach umbrellas ----
    for (const u of W.umbrellas) {
      if (Math.hypot(u.x - eye[0], u.y - eye[2]) > 900) continue;
      GL.box(u.x, 8, u.y, 3, 16, 3, 0, '#f2f2f2');
      GL.box(u.x, 17, u.y, 40, 2, 40, 0, u.color, { rx: 0.12 });
    }
    // ---- buildings: textured facades, balconies, rooftop props, signs ----
    for (const b of W.buildings) {
      const cx = b.x + b.w / 2, cz = b.y + b.h / 2;
      const h = b.hgt * 2.2;
      if (!menuMode && blocksView(b, eye, pl.x, pl.y)) continue; // never hide the player
      GL.box(cx, h / 2, cz, b.w, h, b.h, 0, b.color);
      GL.box(cx, h + 2, cz, b.w + 4, 4, b.h + 4, 0, b.roof);
      const dCam = Math.hypot(cx - eye[0], cz - eye[2]);
      if (dCam < 850) {
        const tex = GL.facadeTexture(b.color, (b.x + b.y) % 4);
        // South + north faces.
        GL.quad(cx, h / 2, b.y + b.h + 0.9, b.w, h, 0, tex, { lit: 1 });
        GL.quad(cx, h / 2, b.y - 0.9, b.w, h, Math.PI, tex, { lit: 1 });
        // East + west faces.
        GL.quad(b.x + b.w + 0.9, h / 2, cz, b.h, h, Math.PI / 2, tex, { lit: 1 });
        GL.quad(b.x - 0.9, h / 2, cz, b.h, h, -Math.PI / 2, tex, { lit: 1 });
        // Balconies on taller buildings (south face).
        if (b.hgt > 24) {
          for (let f = 0; f < 2; f++) {
            const by = h * (0.4 + f * 0.3);
            GL.box(cx, by, b.y + b.h + 5, b.w * 0.6, 2, 10, 0, '#e8e0d0');
            GL.box(cx, by + 5, b.y + b.h + 9, b.w * 0.6, 6, 1.5, 0, '#3a3f4a');
          }
        }
        // Rooftop props: AC units + antenna on some buildings.
        const seed = (b.x * 7 + b.y * 13) % 3;
        if (seed === 0) {
          GL.box(cx - b.w / 4, h + 7, cz, 14, 8, 14, 0, '#9aa5b1');
          GL.box(cx + b.w / 4, h + 10, cz, 2, 20, 2, 0, '#555555');
          GL.box(cx + b.w / 4, h + 18, cz, 14, 1.5, 1.5, 0, '#555555');
        } else if (seed === 1) {
          GL.box(cx, h + 6, cz, 12, 6, 12, 0, '#7a8a99');
        }
        // Neon sign on landmark buildings.
        if (b.sign != null) {
          const s = CFG.SIGNS[b.sign];
          const texS = GL.signTexture(s.text, s.sub, s.bg, s.fg);
          const sw = Math.min(b.w * 0.85, 150);
          GL.quad(cx, h * 0.72, b.y + b.h + 2.2, sw, sw * 0.375, 0, texS, { lit: 0 });
          // Glow strip under the sign.
          GL.box(cx, h * 0.72 - sw * 0.2, b.y + b.h + 1.2, sw * 0.9, 2, 1, 0, s.fg, { unlit: true, alpha: 0.7 });
        }
      }
    }
    // ---- garage forecourt marker ----
    const gb = W.garageBuilding;
    if (gb) {
      const gcx = gb.x + gb.w / 2, gcz = gb.y + gb.h / 2;
      GL.box(gcx, 2, gb.y + gb.h + 14, gb.w * 0.7, 1.5, 26, 0, '#ffd94d', { unlit: true, alpha: 0.85 });
    }
    // ---- roadblocks ----
    for (const rb of game.police.roadblocks) {
      GL.box(rb.x, 6, rb.y, 64, 10, 8, 0, '#ff7a1a');
      GL.box(rb.x, 6, rb.y, 64, 3, 8.5, 0, '#ffffff');
      GL.box(rb.x - 40, 4, rb.y + 12, 6, 8, 6, 0, '#ff7a1a');
      GL.box(rb.x + 40, 4, rb.y - 12, 6, 8, 6, 0, '#ff7a1a');
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
    // ---- street race target (orange) ----
    if (game.race && game.race.active) {
      const rt = global.SolaraActivities.raceTarget(game);
      if (rt) {
        const pulse = 1 + Math.sin(time * 6) * 0.15;
        GL.box(rt.x, 60, rt.y, 7, 120, 7, 0, '#ff8c42', { unlit: true, alpha: 0.85 });
        const r = 30 * pulse;
        GL.box(rt.x - r, 2, rt.y, 4, 1.5, r * 2, 0, '#ff8c42', { unlit: true });
        GL.box(rt.x + r, 2, rt.y, 4, 1.5, r * 2, 0, '#ff8c42', { unlit: true });
        GL.box(rt.x, 2, rt.y - r, r * 2, 1.5, 4, 0, '#ff8c42', { unlit: true });
        GL.box(rt.x, 2, rt.y + r, r * 2, 1.5, 4, 0, '#ff8c42', { unlit: true });
      }
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
    // ---- ammo pickups ----
    if (game.weapons) {
      for (const pk of game.weapons.pickups) {
        if (pk.taken) continue;
        const bob = Math.sin(time * 3 + pk.x) * 3;
        GL.box(pk.x, 10 + bob, pk.y, 18, 12, 4, time * 0.5, '#2fae62');
        GL.box(pk.x, 10 + bob, pk.y, 12, 4, 5, time * 0.5, '#ffffff', { unlit: true });
        GL.box(pk.x, 10 + bob, pk.y, 4, 12, 5, time * 0.5, '#ffffff', { unlit: true });
      }
    }
    // ---- cars: traffic, parked, race rivals, police, player ----
    for (const c of game.traffic) drawCar3D(c.x, c.y, c.angle, c.color, false, time, { smoke: c.smoke });
    for (const c of game.parked) drawCar3D(c.x, c.y, c.angle, c.color, false, time, { smoke: c.smoke });
    if (game.race && game.race.active) {
      for (const rv of game.race.rivals) drawCar3D(rv.x, rv.y, rv.angle, rv.color, false, time, {});
    }
    for (const c of game.police.cars) drawCar3D(c.x, c.y, c.angle, c.color, true, time, { smoke: c.disabled });
    // ---- pedestrians ----
    for (const p of game.peds) {
      drawPerson3D(p.x, p.y, p.angle, p.color, time, time * 6 + p.x, p.height || 1, { hat: p.hat });
    }
    // ---- player ----
    if (!pl.onFoot) {
      const car = pl.car;
      if (car) drawCar3D(car.x, car.y, car.angle, car.color, false, time, { smoke: car.smoke });
    } else {
      drawPerson3D(pl.x, pl.y, pl.angle, pl.color, time, time * 7, 1.5, {});
      if (pl.punchTimer > 0.25) {
        GL.box(pl.x + Math.cos(pl.angle) * 22, 12, pl.y + Math.sin(pl.angle) * 22, 10, 10, 10, -pl.angle, '#ffffff', { unlit: true });
      }
      // Pistol in hand when equipped.
      if (pl.weapon === 'pistol') {
        GL.box(pl.x + Math.cos(pl.angle) * 14, 12, pl.y + Math.sin(pl.angle) * 14, 10, 3, 3, -pl.angle, '#222831');
      }
    }
    // ---- bullet tracers + muzzle flashes ----
    if (game.weapons) {
      for (const t of game.weapons.tracers) {
        const dx = t.x2 - t.x1, dy = t.y2 - t.y1, len = Math.hypot(dx, dy) || 1;
        GL.box((t.x1 + t.x2) / 2, 12, (t.y1 + t.y2) / 2, len, 1.6, 1.6, -Math.atan2(dy, dx), '#ffe9a0', { unlit: true, alpha: Math.min(1, t.t / 0.12) });
      }
      for (const f of game.weapons.flashes) {
        GL.box(f.x, 12, f.y, 12, 12, 12, 0, '#fff3b0', { unlit: true, alpha: 0.9 });
      }
    }
    // ---- helicopter ----
    if (game.police.heli) {
      const h = game.police.heli;
      const hy = 175;
      const ha = -Math.atan2(pl.y - h.y, pl.x - h.x);
      GL.box(h.x, hy, h.y, 34, 14, 16, ha, '#1c2f4a');
      GL.box(h.x - 22, hy + 2, h.y, 26, 6, 6, ha, '#1c2f4a');
      GL.box(h.x, hy + 10, h.y, 56, 2, 4, time * 9, '#222831');
      GL.box(h.x, hy - 10, h.y, 10, 6, 12, ha, '#2d3748'); // skids
      // Searchlight pool on the ground.
      GL.box(pl.x, 1.5, pl.y, 110, 1, 110, 0, '#fff6b0', { unlit: true, alpha: 0.28 });
      GL.box(pl.x, 1.6, pl.y, 60, 1, 60, 0, '#fff6b0', { unlit: true, alpha: 0.35 });
    }
    // ---- sky: sun + glow + clouds + birds (drawn last, far away, unlit) ----
    const ex = eye[0], ez = eye[2];
    GL.box(ex - 1000, 400, ez - 1200, 260, 260, 10, 0, '#ffdf8a', { unlit: true, alpha: 0.4 });
    GL.box(ex - 1000, 400, ez - 1200, 150, 150, 10, 0, '#fff3b0', { unlit: true });
    for (let i = 0; i < 6; i++) {
      const cx2 = ex + ((i * 613) % 1600) - 800;
      const cz2 = ez - 900 + ((i * 377) % 600);
      GL.box(cx2, 300 + (i % 3) * 40, cz2, 220, 26, 90, 0, '#ffffff', { unlit: true, alpha: 0.92 });
      GL.box(cx2 + 60, 320 + (i % 3) * 40, cz2, 140, 20, 70, 0, '#fff7e8', { unlit: true, alpha: 0.9 });
    }
    // Birds: three small dark Vs drifting across the sky.
    for (let i = 0; i < 3; i++) {
      const bx = ex - 500 + ((time * (18 + i * 6) + i * 700) % 1400);
      const bz = ez - 700 + i * 220;
      const by = 340 + i * 30 + Math.sin(time + i * 2) * 8;
      GL.box(bx - 6, by, bz, 12, 2, 2, 0, '#2d3748', { rz: 0.5 });
      GL.box(bx + 6, by, bz, 12, 2, 2, 0, '#2d3748', { rz: -0.5 });
    }
  }

  global.SolaraRender3D = { drawWorld3D, drawCar3D, drawPerson3D };
})(window);
