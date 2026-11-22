// audio.js — all sound is synthesized with WebAudio, no audio files.
// Engine hum, siren, pickup blip, mission jingle, crash thud, plus the
// in-car radio: three invented stations (SOLARA FM, HEAT FM, PALM RADIO),
// each a small step-sequenced loop. Press V to change station while driving.
(function (global) {
  'use strict';
  const CFG = global.SolaraConfig;
  let ctx = null, engineOsc = null, engineGain = null, sirenOn = false, sirenTimer = 0;
  // Radio state: station index, next scheduled note time, step counter.
  const radio = { station: 0, nextTime: 0, step: 0 };
  // Note patterns per station: [midi, beats] loops, bass + lead voices.
  const STATION_PATTERNS = [
    // SOLARA FM — sunset chill: slow minor arpeggio.
    { bass: [45, 0, 45, 0, 41, 0, 43, 0], lead: [69, 72, 76, 72, 69, 67, 64, 67], wave: 'sine', vol: 0.045 },
    // HEAT FM — street bass: driving eighth-note bass, sparse lead.
    { bass: [36, 36, 39, 36, 41, 36, 39, 43], lead: [60, 0, 63, 0, 65, 0, 63, 60], wave: 'square', vol: 0.03 },
    // PALM RADIO — island groove: offbeat skank, warm lead.
    { bass: [41, 0, 48, 0, 41, 0, 45, 0], lead: [65, 69, 72, 69, 67, 69, 72, 76], wave: 'triangle', vol: 0.05 }
  ];
  function midiFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
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
  function noteAt(freq, when, dur, type, vol) {
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(vol, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, when + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(when); o.stop(when + dur + 0.05);
    } catch (e) {}
  }
  function radioTick(driving) {
    if (!ctx || !driving) { radio.nextTime = 0; return; }
    const pat = STATION_PATTERNS[radio.station];
    const bpm = CFG.STATIONS[radio.station].bpm;
    const beat = 60 / bpm / 2; // eighth notes
    if (!radio.nextTime || radio.nextTime < ctx.currentTime - 0.2) radio.nextTime = ctx.currentTime + 0.05;
    while (radio.nextTime < ctx.currentTime + 0.25) {
      const i = radio.step % 8;
      const bass = pat.bass[i], lead = pat.lead[i];
      if (bass) noteAt(midiFreq(bass), radio.nextTime, beat * 0.95, 'triangle', pat.vol);
      if (lead) noteAt(midiFreq(lead), radio.nextTime, beat * 0.9, pat.wave, pat.vol * 0.8);
      radio.nextTime += beat;
      radio.step++;
    }
  }
  function cycleStation() {
    radio.station = (radio.station + 1) % CFG.STATIONS.length;
    radio.step = 0; radio.nextTime = 0;
    return CFG.STATIONS[radio.station].name;
  }
  function stationName() { return CFG.STATIONS[radio.station].name; }
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
    radioTick(driving);
  }
  global.SolaraAudio = { ensure, blip, jingle, thud, update, cycleStation, stationName, radio };
})(window);
