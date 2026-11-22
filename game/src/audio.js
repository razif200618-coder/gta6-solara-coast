// audio.js — synthesized WebAudio: radio music loops, engine hum, SFX. No audio files.
(function (root) {
  var S = root.Solara || (root.Solara = {});
  var A = S.Audio = { ctx: null, muted: false, station: 0, _musicTimer: null, _step: 0 };
  // Station chord roots / scales (original loops, no sampled music).
  var STATIONS = [
    { name: 'SOLARA FM', bpm: 96, notes: [220, 261.6, 329.6, 392, 440, 329.6, 261.6, 196], wave: 'triangle' },
    { name: 'HEAT FM', bpm: 128, notes: [110, 130.8, 164.8, 196, 220, 164.8, 130.8, 98], wave: 'sawtooth' },
    { name: 'PALM RADIO', bpm: 80, notes: [261.6, 293.7, 329.6, 392, 493.9, 440, 392, 329.6], wave: 'sine' }
  ];
  A.ensure = function () {
    if (A.ctx) return A.ctx;
    try {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      A.ctx = new AC();
    } catch (e) { A.ctx = null; }
    return A.ctx;
  };
  A.tone = function (freq, dur, type, vol, when) {
    if (A.muted || !A.ensure()) return;
    try {
      var t = A.ctx.currentTime + (when || 0);
      var o = A.ctx.createOscillator(), g = A.ctx.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(A.ctx.destination);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* audio is best-effort */ }
  };
  A.shot = function (kind) { if (kind === 'pistol') { A.tone(180, 0.12, 'square', 0.25); A.tone(60, 0.15, 'sawtooth', 0.2); } else { A.tone(90, 0.08, 'sine', 0.2); } };
  A.emptyClick = function () { A.tone(1200, 0.05, 'square', 0.08); };
  A.door = function () { A.tone(140, 0.15, 'triangle', 0.18); };
  A.skid = function () { A.tone(900, 0.2, 'sawtooth', 0.03); };
  A.pickup = function () { A.tone(660, 0.1, 'sine', 0.15); A.tone(880, 0.15, 'sine', 0.15, 0.09); };
  A.checkpoint = function () { A.tone(523, 0.1, 'triangle', 0.15); A.tone(784, 0.2, 'triangle', 0.15, 0.08); };
  A.missionDone = function () { [523, 659, 784, 1046].forEach(function (f, i) { A.tone(f, 0.18, 'triangle', 0.15, i * 0.1); }); };
  A.purchase = function () { A.tone(880, 0.08, 'sine', 0.15); A.tone(1174, 0.12, 'sine', 0.15, 0.07); };
  A.busted = function () { [392, 311, 233].forEach(function (f, i) { A.tone(f, 0.3, 'sawtooth', 0.12, i * 0.22); }); };
  A.siren = function () { A.tone(700, 0.4, 'sine', 0.04); A.tone(950, 0.4, 'sine', 0.04, 0.4); };
  A.radio = function (idx) {
    A.station = idx % STATIONS.length;
    A._step = 0;
    return STATIONS[A.station].name;
  };
  A.stationName = function () { return STATIONS[A.station % STATIONS.length].name; };
  // Step the music sequencer once (called from the game loop).
  A.musicStep = function () {
    if (A.muted || !A.ctx) return;
    var st = STATIONS[A.station % STATIONS.length];
    var n = st.notes[A._step % st.notes.length];
    A.tone(n, 0.22, st.wave, 0.05);
    if (A._step % 4 === 0) A.tone(n / 2, 0.3, 'sine', 0.08);
    A._step++;
  };
  A.setMuted = function (m) { A.muted = !!m; return A.muted; };
})(typeof window !== 'undefined' ? window : globalThis);
