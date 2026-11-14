/* =========================================================
   Âm thanh — Web Audio
   - Nhạc nền: dùng file assets/audio/bgm.mp3 nếu được khai báo
     trong SITE_CONFIG.bgm; nếu không, tự chơi một vòng nhạc hộp nhẹ.
   - Hiệu ứng: lật trang, phấn, mở thư, mở quà.
   ========================================================= */
(function () {
  'use strict';

  var NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

  function freq(name) {
    var m = /^([A-G]#?)(-?\d)$/.exec(name);
    if (!m) return 440;
    var n = NOTE[m[1]] + (parseInt(m[2], 10) + 1) * 12;
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  function AudioEngine() {
    this.ctx = null;
    this.master = null;
    this.music = null;
    this.sfxBus = null;
    this.noise = null;
    this.ready = false;
    this.started = false;
    this.muted = false;
    this.bgmEl = null;
    this.usingFile = false;
    this._timer = null;
    this._nextBar = 0;
    this._bar = 0;

    try { this.muted = localStorage.getItem('nld-muted') === '1'; } catch (e) { this.muted = false; }
  }

  AudioEngine.prototype.init = function () {
    if (this.ready) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    try {
      this.ctx = new AC();
    } catch (e) {
      return;
    }

    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0.0001 : 0.9;
    this.master.connect(this.ctx.destination);

    this.music = this.ctx.createGain();
    this.music.gain.value = 0.34;
    this.music.connect(this.master);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.5;
    this.sfxBus.connect(this.master);

    // buffer nhiễu dùng cho tiếng giấy / phấn
    var len = Math.floor(this.ctx.sampleRate * 1.2);
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    var data = this.noise.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);

    this.ready = true;

    var src = window.SITE_CONFIG && window.SITE_CONFIG.bgm;
    if (src) this._loadFile(src);
    else this._startProcedural();
  };

  AudioEngine.prototype._loadFile = function (src) {
    var self = this;
    var el = new Audio();
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0;
    el.src = src;
    this.bgmEl = el;

    var done = false;
    el.addEventListener('canplaythrough', function () {
      if (done) return;
      done = true;
      self.usingFile = true;
      if (self._timer) {
        clearInterval(self._timer);
        self._timer = null;
      }
      if (self.started && !self.muted) self._playFile();
    });

    el.addEventListener('error', function () {
      if (done) return;
      done = true;
      self.bgmEl = null;
      self._startProcedural();
    });

    el.load();
  };

  AudioEngine.prototype._playFile = function () {
    var self = this;
    if (!this.bgmEl) return;
    var p = this.bgmEl.play();
    if (p && p.catch) p.catch(function () {});
    this._fadeFile(0.5);
  };

  AudioEngine.prototype._fadeFile = function (to) {
    var el = this.bgmEl;
    if (!el) return;
    var from = el.volume;
    var t0 = performance.now();
    function step(t) {
      var k = Math.min(1, Math.max(0, (t - t0) / 900));
      el.volume = Math.min(1, Math.max(0, from + (to - from) * k));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };

  /* ---------- nhạc hộp tự tổng hợp ---------- */
  AudioEngine.prototype._startProcedural = function () {
    if (!this.ready || this.usingFile) return;
    if (this._timer) return;

    this._nextBar = this.ctx.currentTime + 0.15;
    this._bar = 0;

    var self = this;
    this._timer = setInterval(function () { self._schedule(); }, 240);
    this._schedule();
  };

  var PROG = [
    { pad: ['D3', 'F#3', 'A3', 'C#4'], arp: ['D4', 'A4', 'F#4', 'C#5', 'A4', 'F#4', 'A4', 'D5'] },
    { pad: ['B2', 'D3', 'F#3', 'A3'], arp: ['B3', 'F#4', 'D4', 'A4', 'F#4', 'D4', 'F#4', 'B4'] },
    { pad: ['G2', 'B2', 'D3', 'F#3'], arp: ['G3', 'D4', 'B3', 'F#4', 'D4', 'B3', 'D4', 'G4'] },
    { pad: ['A2', 'C#3', 'E3', 'G3'], arp: ['A3', 'E4', 'C#4', 'G4', 'E4', 'C#4', 'E4', 'A4'] }
  ];

  AudioEngine.prototype._schedule = function () {
    if (!this.ctx) return;
    if (this.muted) {
      this._nextBar = this.ctx.currentTime + 0.2;
      return;
    }
    var beat = 60 / 62;          // 62 BPM
    var barLen = beat * 4;
    var slip = 1.4;

    if (this._nextBar < this.ctx.currentTime) {
      this._nextBar = this.ctx.currentTime + 0.05;
    }

    while (this._nextBar < this.ctx.currentTime + slip) {
      var t = this._nextBar;
      var chord = PROG[this._bar % PROG.length];

      this._pad(t, chord.pad, barLen);

      for (var i = 0; i < chord.arp.length; i++) {
        var note = chord.arp[i];
        var at = t + i * (beat / 2);
        var vel = i === 0 ? 0.11 : (i % 2 === 0 ? 0.075 : 0.055);
        this._bell(at, freq(note), 1.9, vel);
      }

      // quãng tám cao thưa ở nhịp 2 và 4
      this._bell(t + beat * 2.6, freq(chord.arp[3]) * 2, 1.4, 0.03);

      this._nextBar += barLen;
      this._bar++;
    }
  };

  AudioEngine.prototype._bell = function (t, f, dur, gain) {
    if (!this.ctx) return;
    var o1 = this.ctx.createOscillator();
    var o2 = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    var g2 = this.ctx.createGain();

    o1.type = 'sine';
    o1.frequency.value = f;
    o2.type = 'triangle';
    o2.frequency.value = f * 2.004;

    g2.gain.value = 0.16;

    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    o1.connect(g);
    o2.connect(g2);
    g2.connect(g);
    g.connect(this.music);

    o1.start(t);
    o2.start(t);
    o1.stop(t + dur + 0.05);
    o2.stop(t + dur + 0.05);
  };

  AudioEngine.prototype._pad = function (t, notes, dur) {
    if (!this.ctx) return;
    for (var i = 0; i < notes.length; i++) {
      var o = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq(notes[i]);
      o.detune.value = i % 2 ? 5 : -5;

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.028, t + 1.4);
      g.gain.setValueAtTime(0.028, t + dur - 1.2);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);

      o.connect(g);
      g.connect(this.music);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  };

  /* ---------- hiệu ứng ---------- */
  AudioEngine.prototype.sfx = function (name) {
    if (!this.ready || this.muted || !this.ctx) return;
    var ctx = this.ctx;
    var t = ctx.currentTime;

    if (name === 'page') {
      var s = ctx.createBufferSource();
      s.buffer = this.noise;
      var bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(900, t);
      bp.frequency.exponentialRampToValueAtTime(2600, t + 0.28);
      bp.Q.value = 0.8;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      s.connect(bp); bp.connect(g); g.connect(this.sfxBus);
      s.start(t); s.stop(t + 0.5);
      return;
    }

    if (name === 'tick') {
      var s2 = ctx.createBufferSource();
      s2.buffer = this.noise;
      var hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1800;
      var g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.linearRampToValueAtTime(0.1, t + 0.008);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      s2.connect(hp); hp.connect(g2); g2.connect(this.sfxBus);
      s2.start(t); s2.stop(t + 0.15);
      return;
    }

    if (name === 'open') {
      var notes = ['D5', 'F#5', 'A5', 'D6'];
      for (var i = 0; i < notes.length; i++) {
        this._bell(t + i * 0.09, freq(notes[i]), 1.6, 0.09);
      }
      return;
    }

    if (name === 'seal') {
      var o = ctx.createOscillator();
      var g3 = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(70, t + 0.28);
      g3.gain.setValueAtTime(0.0001, t);
      g3.gain.linearRampToValueAtTime(0.16, t + 0.02);
      g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
      o.connect(g3); g3.connect(this.sfxBus);
      o.start(t); o.stop(t + 0.4);
      return;
    }

    if (name === 'chime') {
      this._bell(t, freq('A5'), 1.8, 0.08);
      this._bell(t + 0.02, freq('E5'), 1.8, 0.05);
    }
  };

  /* ---------- khởi động / tắt mở ---------- */
  AudioEngine.prototype.start = function () {
    if (this.started) return;
    this.started = true;
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') this.ctx.resume().catch(function () {});
    if (this.muted) return;

    if (this.usingFile) this._playFile();
    else this._startProcedural();
  };

  AudioEngine.prototype.applyMute = function () {
    if (!this.ready) return;
    var target = this.muted ? 0.0001 : 0.9;
    var g = this.master.gain;
    var now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.0001, g.value), now);
    g.linearRampToValueAtTime(target, now + 0.35);

    if (this.bgmEl) {
      if (this.muted) this.bgmEl.pause();
      else if (this.started) this._playFile();
    }

    if (!this.muted && this.started && !this.usingFile && !this._timer) {
      this._startProcedural();
    }
  };

  AudioEngine.prototype.toggle = function () {
    this.muted = !this.muted;
    try { localStorage.setItem('nld-muted', this.muted ? '1' : '0'); } catch (e) {}

    if (!this.started && !this.muted) {
      this.start();
    } else {
      this.applyMute();
    }

    document.body.classList.toggle('is-muted', this.muted);
    var btn = document.getElementById('soundBtn');
    if (btn) {
      btn.setAttribute('aria-pressed', this.muted ? 'false' : 'true');
      btn.setAttribute('aria-label', this.muted ? 'Bật nhạc nền' : 'Tắt nhạc nền');
    }
    if (this.muted) this.sfx('chime');
    return this.muted;
  };

  AudioEngine.prototype.duck = function (on) {
    if (!this.ready) return;
    var now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.muted ? 0.0001 : (on ? 0.06 : 0.9), now, 0.4);
  };

  window.NguoiLaiDoAudio = new AudioEngine();
})();
