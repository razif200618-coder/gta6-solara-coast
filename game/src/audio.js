// audio.js — all sound is synthesized with WebAudio, no audio files.
// Engine hum, siren, pickup blip, mission jingle, crash thud.
(function (global) {
  'use strict';
  let ctx = null, engineOsc = null, engineGain = null, sirenOn = false, sirenTimer = 0;
  function ensure() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      engineOsc = ctx.createOscillator(); engineGain = ctx.createGain();
      engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 60; engineGain.gain.value = 0;
      engineOsc.connect(engineGain); engineGain.connect(ctx.destination); engineOsc.start();
    } catch (e) { ctx = null; }
    return ctx;
  }
  function blip(freq, dur, type, vol) {
    if (!ensure()) return;
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine'; o.frequency.value = freq; g.gain.value = vol || 0.08;
      o.connect(g); g.connect(ctx.destination);
      o.start(); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (dur || 0.12));
      o.stop(ctx.currentTime + (dur || 0.12));
    } catch (e) {}
  }
  function jingle() { blip(523, 0.12, 'sine', 0.1); setTimeout(() => blip(659, 0.12, 'sine', 0.1), 120); setTimeout(() => blip(784, 0.22, 'sine', 0.12), 240); }
  function thud() { blip(90, 0.18, 'triangle', 0.16); }
  function update(dt, driving, speed, wanted) {
    if (!ctx) return;
    if (engineGain) engineGain.gain.value = driving ? 0.02 + Math.min(0.05, Math.abs(speed) * 0.00012) : 0;
    if (engineOsc) engineOsc.frequency.value = driving ? 55 + Math.abs(speed) * 0.35 : 60;
    sirenTimer -= dt;
    if (wanted > 0 && sirenTimer <= 0) {
      sirenOn = !sirenOn; blip(sirenOn ? 780 : 580, 0.35, 'square', 0.03); sirenTimer = 0.38;
    }
  }
  global.SolaraAudio = { ensure, blip, jingle, thud, update };
})(window);
