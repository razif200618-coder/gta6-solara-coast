// missions.js — the 10 story missions of SOLARA HEAT.
// Types: goto (reach the marker), collect (pick up N crates), race
// (checkpoints in order against a timer), escape (lose the wanted level,
// then reach the hideout). Each mission pays cash and respect.
(function (global) {
  'use strict';
  const MISSIONS = [
    { id: 1, title: 'First Wheels', giver: 'Dara', brief: 'Dara needs wheels. Steal any car and bring it to the Marina garage.', type: 'goto', target: { x: 2050, y: 520 }, reward: 150, respect: 10 },
    { id: 2, title: 'Courier Run', giver: 'Dara', brief: 'Deliver the package to the Beach Cafe before the timer runs out.', type: 'goto', target: { x: 1250, y: 1520 }, timer: 75, reward: 220, respect: 12 },
    { id: 3, title: 'Getaway', giver: 'Kiko', brief: 'The Solara police are on you. Lose them, then reach the Old Town hideout.', type: 'escape', target: { x: 420, y: 420 }, reward: 300, respect: 15 },
    { id: 4, title: 'Street Race', giver: 'Rex', brief: 'Beat the rival through 5 checkpoints around Downtown. No shortcuts — the checkpoints decide.', type: 'race', checkpoints: [{ x: 820, y: 520 }, { x: 1460, y: 520 }, { x: 1460, y: 1160 }, { x: 820, y: 1160 }, { x: 1140, y: 840 }], timer: 90, reward: 400, respect: 18 },
    { id: 5, title: 'The Pickup', giver: 'Dara', brief: 'Collect 3 crates scattered around the city. Watch for patrols.', type: 'collect', crates: [{ x: 520, y: 840 }, { x: 1780, y: 840 }, { x: 1140, y: 1480 }], reward: 350, respect: 16 },
    { id: 6, title: 'Harbor Heist', giver: 'Kiko', brief: 'Grab the briefcase at the harbor, then escape to the hideout with the police on your tail.', type: 'escape', target: { x: 420, y: 420 }, pickup: { x: 2250, y: 1160 }, reward: 600, respect: 22 },
    { id: 7, title: 'Escort', giver: 'Mara', brief: 'Drive Mara across the city to the lighthouse road. Keep her safe — no hard crashes.', type: 'goto', target: { x: 2350, y: 1520 }, timer: 100, reward: 500, respect: 20 },
    { id: 8, title: 'King of Solara', giver: 'Rex', brief: 'The final race: 5 checkpoints, then reach the lighthouse. Win it and Solara is yours.', type: 'race', checkpoints: [{ x: 520, y: 520 }, { x: 1780, y: 520 }, { x: 1780, y: 1480 }, { x: 520, y: 1480 }, { x: 2350, y: 1520 }], timer: 120, reward: 1000, respect: 30 },
    { id: 9, title: 'Beachfront Blitz', giver: 'Dara', brief: 'A sunrise sprint down the beachfront boulevard: 5 checkpoints before the timer runs out.', type: 'race', checkpoints: [{ x: 520, y: 1480 }, { x: 1140, y: 1480 }, { x: 1780, y: 1480 }, { x: 2250, y: 1480 }, { x: 2350, y: 1520 }], timer: 100, reward: 550, respect: 24 },
    { id: 10, title: 'The Solara Job', giver: 'Rex', brief: 'The big one: grab the lighthouse stash, then lose a full police response and reach the hideout.', type: 'escape', target: { x: 420, y: 420 }, pickup: { x: 2350, y: 1520 }, wantedOnPickup: 2, reward: 1200, respect: 35 }
  ];
  function makeMissionState() {
    return { active: null, step: 0, timer: 0, collected: 0, pickedUp: false, completed: [], message: '' };
  }
  function startMission(state, idx) {
    const m = MISSIONS[idx];
    if (!m) return null;
    state.active = m; state.step = 0; state.timer = m.timer || 0; state.collected = 0; state.pickedUp = false;
    state.message = 'Mission: ' + m.title + ' — ' + m.brief;
    return m;
  }
  function currentTarget(state) {
    const m = state.active; if (!m) return null;
    if (m.type === 'race') return m.checkpoints[Math.min(state.step, m.checkpoints.length - 1)];
    if (m.type === 'collect') return m.crates[state.collected] || m.target;
    if (m.type === 'escape' && m.pickup && !state.pickedUp) return m.pickup;
    return m.target;
  }
  // Returns 'done' | 'failed' | null. Mutates state.
  function updateMission(state, player, police, dt) {
    const m = state.active; if (!m) return null;
    if (m.timer) { state.timer -= dt; if (state.timer <= 0) { state.active = null; state.message = 'Mission failed: out of time.'; return 'failed'; } }
    const t = currentTarget(state);
    if (!t) return null;
    const d = Math.hypot(player.x - t.x, player.y - t.y);
    if (m.type === 'collect') {
      if (d < 46) { state.collected++; state.message = 'Crate ' + state.collected + '/' + m.crates.length + ' collected.'; if (state.collected >= m.crates.length) return complete(state, player); }
      return null;
    }
    if (m.type === 'escape' && m.pickup && !state.pickedUp) {
      if (d < 46) {
        state.pickedUp = true; state.message = 'Briefcase grabbed! Now lose the police and reach the hideout.';
        if (m.wantedOnPickup && typeof global.SolaraPolice !== 'undefined') global.SolaraPolice.addWanted(police, m.wantedOnPickup, { player });
      }
      return null;
    }
    if (m.type === 'race') {
      if (d < 56) {
        state.step++;
        if (state.step >= m.checkpoints.length) return complete(state, player);
        state.message = 'Checkpoint ' + (state.step + 1) + '/' + m.checkpoints.length;
      }
      return null;
    }
    if (m.type === 'escape') {
      if (police.wanted > 0) { state.message = 'Lose the police first, then reach the hideout.'; return null; }
      if (d < 56) return complete(state, player);
      return null;
    }
    if (d < 56) return complete(state, player);
    return null;
  }
  function complete(state, player) {
    const m = state.active;
    player.cash += m.reward; player.respect += m.respect;
    state.completed.push(m.id);
    state.message = 'Mission complete: ' + m.title + ' +$' + m.reward;
    state.active = null;
    return 'done';
  }
  global.SolaraMissions = { MISSIONS, makeMissionState, startMission, currentTarget, updateMission };
})(window);
