// player.js — the player on foot and behind the wheel.
// On foot: WASD walk, Shift run, Space punch. In a car: WASD drive with
// simple arcade physics, Space handbrake, E to get in/out near a car.
(function (global) {
  'use strict';
  const W = global.SolaraWorld;
  function makePlayer() {
    return { x: 520, y: 520, angle: 0, speed: 0, onFoot: true, car: null, health: 100, cash: 120, respect: 0, punchTimer: 0, color: '#2f6fb8', weapon: 'fists', ammo: 12, shootTimer: 0, standing: { Marina: 0, 'Old Town': 0, Downtown: 0, Beachfront: 0 } };
  }
  function moveWithCollision(p, nx, ny, r) {
    if (!W.hitBuilding(nx, p.y, r)) p.x = nx;
    if (!W.hitBuilding(p.x, ny, r)) p.y = ny;
    const c = W.clampWorld(p.x, p.y, r); p.x = c.x; p.y = c.y;
  }
  function updatePlayer(p, input, dt, game) {
    p.punchTimer = Math.max(0, p.punchTimer - dt);
    p.shootTimer = Math.max(0, (p.shootTimer || 0) - dt);
    if (input.space && p.onFoot && p.punchTimer <= 0) { p.punchTimer = 0.45; game.onPunch && game.onPunch(); }
    if (p.onFoot) {
      const sp = (input.shift ? 230 : 140);
      // On foot, movement is relative to the chase camera: W walks away
      // from the camera, A/D strafe. The camera heading is set by the
      // 3D renderer each frame; fall back to the player's own angle.
      const ch = (game && game.camHeading != null) ? game.camHeading : p.angle;
      const fx = Math.cos(ch), fz = Math.sin(ch);
      const rx = -Math.sin(ch), rz = Math.cos(ch);
      const fwd = (input.up ? 1 : 0) - (input.down ? 1 : 0);
      const strafe = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      let dx = fx * fwd + rx * strafe;
      let dy = fz * fwd + rz * strafe;
      if (dx || dy) {
        const len = Math.hypot(dx, dy); dx /= len; dy /= len;
        p.angle = Math.atan2(dy, dx);
        moveWithCollision(p, p.x + dx * sp * dt, p.y + dy * sp * dt, 12);
      }
    } else if (p.car) {
      const car = p.car;
      const accel = input.up ? 260 + (car.upgrades.engine || 0) * 60 : (input.down ? -200 : 0);
      car.speed += accel * dt;
      car.speed *= Math.pow(0.4, dt); // drag
      if (input.space) car.speed *= Math.pow(0.05, dt); // handbrake
      car.speed = Math.max(-90, Math.min(340 + (car.upgrades.engine || 0) * 45, car.speed));
      const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
      if (Math.abs(car.speed) > 5) car.angle += steer * (car.speed > 0 ? 1 : -1) * 1.9 * dt * Math.min(1, Math.abs(car.speed) / 120);
      let nx = car.x + Math.cos(car.angle) * car.speed * dt;
      let ny = car.y + Math.sin(car.angle) * car.speed * dt;
      const hit = W.hitBuilding(nx, ny, 20);
      if (hit) {
        car.speed *= -0.25;
        // Crashes damage the car (armor softens it); a wrecked car stalls.
        const dmg = Math.max(2, 10 - (car.upgrades.armor || 0) * 3);
        car.hp = Math.max(0, (car.hp == null ? 100 : car.hp) - dmg);
        if (car.hp <= 0) { car.speed = 0; car.smoke = 1; }
        game.onCrash && game.onCrash();
        nx = car.x; ny = car.y;
      }
      const c = W.clampWorld(nx, ny, 20); car.x = c.x; car.y = c.y;
      p.x = car.x; p.y = car.y; p.angle = car.angle;
    }
  }
  function nearestCar(p, cars, maxD) {
    let best = null, bd = maxD;
    for (const c of cars) {
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  global.SolaraPlayer = { makePlayer, updatePlayer, nearestCar, moveWithCollision };
})(window);
