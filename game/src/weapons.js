// weapons.js — weapon combat for SOLARA HEAT.
// Slot 1: fists (Space punch, already in player.js). Slot 2: pistol —
// hitscan shots with ammo, tracers and muzzle flash. Shooting a pedestrian
// or a police cruiser is a crime and raises the wanted level.
// Ammo pickups sit at the hideout, the garage and the Beach Cafe.
(function (global) {
  'use strict';
  const W = global.SolaraWorld;

  const AMMO_SPOTS = [
    { x: 420, y: 420, name: 'Hideout stash' },
    { x: 2050, y: 520, name: 'Garage stash' },
    { x: 1250, y: 1520, name: 'Beach Cafe stash' }
  ];
  const AMMO_AMOUNT = 12;

  function makeWeaponState() {
    return {
      tracers: [], // {x1,y1,x2,y2,t}
      flashes: [], // {x,y,t}
      pickups: AMMO_SPOTS.map(s => ({ x: s.x, y: s.y, name: s.name, taken: false })),
      shootCooldown: 0
    };
  }

  function switchWeapon(player, id) {
    if (id === 'fists' || id === 'pistol') { player.weapon = id; return true; }
    return false;
  }

  // Fire one pistol shot from the player along their facing angle.
  // Returns 'shot' | 'empty' | 'no-weapon' | null.
  function shoot(game) {
    const p = game.player, w = game.weapons;
    if (!p || p.weapon !== 'pistol') return 'no-weapon';
    if (w.shootCooldown > 0 || p.shootTimer > 0) return null;
    if ((p.ammo || 0) <= 0) { global.SolaraAudio.blip(140, 0.08, 'square', 0.08); return 'empty'; }
    p.ammo--;
    p.shootTimer = 0.28; w.shootCooldown = 0.28;
    const range = 340;
    const ex = p.x + Math.cos(p.angle) * range, ey = p.y + Math.sin(p.angle) * range;
    let endX = ex, endY = ey, hit = null, hitD = range;
    // Nearest police cruiser inside the firing cone.
    for (const c of game.police.cars) {
      if (c.disabled) continue;
      const dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy);
      if (d > range || d < 1) continue;
      const ad = Math.abs(Math.atan2(dy, dx) - p.angle);
      const a = ad > Math.PI ? Math.PI * 2 - ad : ad;
      if (a < 0.28 && d < hitD) { hitD = d; hit = { kind: 'police', obj: c }; }
    }
    // Nearest pedestrian inside the cone (only if closer than the cruiser).
    for (const ped of game.peds) {
      const dx = ped.x - p.x, dy = ped.y - p.y, d = Math.hypot(dx, dy);
      if (d > range || d < 1) continue;
      const ad = Math.abs(Math.atan2(dy, dx) - p.angle);
      const a = ad > Math.PI ? Math.PI * 2 - ad : ad;
      if (a < 0.3 && d < hitD) { hitD = d; hit = { kind: 'ped', obj: ped }; }
    }
    if (hit) {
      endX = hit.obj.x; endY = hit.obj.y;
      if (hit.kind === 'police') {
        hit.obj.hp = (hit.obj.hp == null ? 3 : hit.obj.hp) - 1;
        if (hit.obj.hp <= 0) { hit.obj.disabled = true; hit.obj.speed = 0; game.missions.message = 'Police cruiser disabled!'; }
        else game.missions.message = 'You shot a police cruiser!';
        global.SolaraPolice.addWanted(game.police, 1, game);
      } else {
        hit.obj.flee = 3; hit.obj.angle = Math.atan2(hit.obj.y - p.y, hit.obj.x - p.x);
        game.missions.message = 'You shot at a pedestrian! Wanted level up.';
        global.SolaraPolice.addWanted(game.police, 1, game);
      }
    }
    const mx = p.x + Math.cos(p.angle) * 26, my = p.y + Math.sin(p.angle) * 26;
    w.tracers.push({ x1: mx, y1: my, x2: endX, y2: endY, t: 0.12 });
    w.flashes.push({ x: mx, y: my, t: 0.08 });
    global.SolaraAudio.blip(1400, 0.07, 'square', 0.12);
    global.SolaraAudio.blip(220, 0.12, 'sawtooth', 0.1);
    return 'shot';
  }

  function updateWeapons(game, dt) {
    const w = game.weapons;
    w.shootCooldown = Math.max(0, w.shootCooldown - dt);
    for (const t of w.tracers) t.t -= dt;
    w.tracers = w.tracers.filter(t => t.t > 0);
    for (const f of w.flashes) f.t -= dt;
    w.flashes = w.flashes.filter(f => f.t > 0);
    // Ammo pickups: walk over one to refill.
    const p = game.player;
    for (const pk of w.pickups) {
      if (pk.taken) continue;
      if (Math.hypot(pk.x - p.x, pk.y - p.y) < 42) {
        pk.taken = true;
        p.ammo = Math.min(48, (p.ammo || 0) + AMMO_AMOUNT);
        game.missions.message = pk.name + ': +12 pistol ammo.';
        global.SolaraAudio.blip(880, 0.1, 'sine', 0.1);
      }
    }
  }

  function resetPickups(game) {
    for (const pk of game.weapons.pickups) pk.taken = false;
  }

  global.SolaraWeapons = { makeWeaponState, switchWeapon, shoot, updateWeapons, resetPickups, AMMO_SPOTS };
})(window);
