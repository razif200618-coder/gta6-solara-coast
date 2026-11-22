// input.js — keyboard state. WASD/arrows move, E enter/exit car,
// Space punch/handbrake, Shift run/boost, M mission, P pause, R reset.
(function (global) {
  'use strict';
  const keys = {};
  const pressed = {}; // edge-triggered, consumed by game
  window.addEventListener('keydown', function (e) {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (!keys[k]) pressed[k] = true;
    keys[k] = true;
  });
  window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  function down() {
    return {
      up: !!(keys.w || keys.arrowup), down: !!(keys.s || keys.arrowdown),
      left: !!(keys.a || keys.arrowleft), right: !!(keys.d || keys.arrowright),
      shift: !!keys.shift, space: !!keys[' ']
    };
  }
  function was(k) { const v = !!pressed[k]; pressed[k] = false; return v; }
  function clearPressed() { for (const k in pressed) pressed[k] = false; }
  global.SolaraInput = { keys, down, was, clearPressed };
})(window);
