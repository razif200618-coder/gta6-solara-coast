// input.js — keyboard state + action keys (E enter car, G garage, T race,
// V radio, F shoot, Space punch/handbrake, 1/2 weapons, P pause, M mute).
(function (root) {
  var S = root.Solara || (root.Solara = {});
  var I = S.Input = {
    up: false, down: false, left: false, right: false,
    run: false, handbrake: false, keys: {}
  };
  var KEYMAP = {
    KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'run', ShiftRight: 'run', Space: 'handbrake'
  };
  I.handleKey = function (code, down) {
    I.keys[code] = down;
    var field = KEYMAP[code];
    if (field) I[field] = down;
    if (!down) return null;
    // One-shot actions.
    if (code === 'KeyE') return 'enterCar';
    if (code === 'KeyG') return 'garage';
    if (code === 'KeyT') return 'race';
    if (code === 'KeyV') return 'radio';
    if (code === 'KeyF') return 'shoot';
    if (code === 'Digit1') return 'fists';
    if (code === 'Digit2') return 'pistol';
    if (code === 'KeyM') return 'mute';
    if (code === 'KeyP' || code === 'Escape') return 'pause';
    if (code === 'Enter') return 'start';
    return null;
  };
  I.attach = function () {
    if (typeof document === 'undefined') return;
    document.addEventListener('keydown', function (e) {
      if (e.code === 'Space') e.preventDefault();
      var action = I.handleKey(e.code, true);
      if (action && S.Main) S.Main.onAction(action);
    });
    document.addEventListener('keyup', function (e) { I.handleKey(e.code, false); });
  };
})(typeof window !== 'undefined' ? window : globalThis);
