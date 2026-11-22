// input.js — keyboard state + camera orbit. WASD/arrows move, E enter/exit car,
// Space punch/handbrake, Shift run/boost, M mission, P pause, R reset.
// Q/E or mouse-drag orbits the chase camera around the player.
(function (global) {
  'use strict';
  const keys = {};
  const pressed = {}; // edge-triggered, consumed by game
  let orbit = 0; // camera yaw offset from the player's heading
  let dragging = false, lastX = 0;
  window.addEventListener('keydown', function (e) {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (!keys[k]) pressed[k] = true;
    keys[k] = true;
  });
  window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  window.addEventListener('mousedown', function (e) { dragging = true; lastX = e.clientX; });
  window.addEventListener('mouseup', function () { dragging = false; });
  window.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    orbit += (e.clientX - lastX) * 0.005;
    lastX = e.clientX;
  });
  function down() {
    if (keys.q) orbit -= 0.03; // Q orbits the camera left (E is enter/exit car)
    return {
      up: !!(keys.w || keys.arrowup), down: !!(keys.s || keys.arrowdown),
      left: !!(keys.a || keys.arrowleft), right: !!(keys.d || keys.arrowright),
      shift: !!keys.shift, space: !!keys[' ']
    };
  }
  function was(k) { const v = !!pressed[k]; pressed[k] = false; return v; }
  function clearPressed() { for (const k in pressed) pressed[k] = false; }
  global.SolaraInput = {
    keys, down, was, clearPressed,
    get orbit() { return orbit; },
    set orbit(v) { orbit = v; }
  };
})(window);
