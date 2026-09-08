/* ===========================================================================
   Marwari Radio — the set itself: dial, needle, plate, cards, timer, share.
   Everything Tai says goes through Tai.speakLine(); everything that makes
   sound comes from TrackSource. This file only turns knobs.
   =========================================================================== */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var el = {
    radio: $('radio'), gate: $('gate'), gateBtn: $('gate-btn'), gateLine: $('gate-line'),
    gateNote: $('gate-note'),
    marks: $('dial-marks'), strip: $('dial-strip'), needle: $('needle'),
    plateName: $('plate-name'), plateTag: $('plate-tagline'), plateOcc: $('plate-occasion'),
    npStation: $('np-station'), npTitle: $('np-title'), npRoman: $('np-roman'),
    npArtist: $('np-artist'), npFill: $('np-fill'), npElapsed: $('np-elapsed'),
    npIndex: $('np-index'),
    hostcard: $('hostcard'), hostDev: $('host-dev'), hostRom: $('host-rom'), hostEn: $('host-en'),
    btnPlay: $('btn-play'), btnNext: $('btn-next'), btnSleep: $('btn-sleep'), btnShare: $('btn-share'),
    sleepTag: $('sleep-tag'), sheet: $('sleepsheet'), toast: $('toast'),
    btnVoice: $('btn-voice'), btnVoiceState: $('btn-voice-state'),
    announce: $('announce'), toran: $('toran')
  };

  var state = {
    stations: [],
    si: 0,              // station index
    ti: 0,              // track index inside the station
    queue: [],
    playing: false,
    started: false,
    seq: 0,             // cancels stale async sequences when the dial moves
    sincePatter: 0,
    patterEvery: 2 + Math.floor(Math.random() * 2),   // a line every 2-3 tracks
    deadRun: 0,
    sleepMin: 0,
    sleepAt: 0,
    sleepTimer: null,
    listenedFrom: 0,
    signedOffAt: 0,
    /* Tai's spoken voice is OFF by default: hearing her announce every song
       change gets tiresome fast, and waiting for her to finish before the
       music starts is worse. Her lines still appear on the card - that was
       always the subtitle - and the switch below turns the audio back on. */
    voice: false
  };
  try {
    state.voice = localStorage.getItem('mr:voice') === 'on';
  } catch (e) {}

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==================================================================== SFX
     Radio static, the tuning clunk and a temple bell — all generated, no
     files to ship. Nothing is created until the first tap.               */
  var actx = null;
  function audio() {
    if (actx) return actx;
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { actx = new C(); } catch (e) { return null; }
    return actx;
  }
  function noiseBuffer(ctx, secs) {
    var len = Math.floor(ctx.sampleRate * secs);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  function sfxStatic() {
    var ctx = audio(); if (!ctx) return;
    var t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 0.7);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 1.6;
    bp.frequency.setValueAtTime(380, t);
    bp.frequency.exponentialRampToValueAtTime(2800, t + 0.34);
    bp.frequency.exponentialRampToValueAtTime(520, t + 0.62);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.66);
    src.connect(bp); bp.connect(g); g.connect(ctx.destination);
    src.start(t); src.stop(t + 0.7);
  }
  function sfxClunk() {
    var ctx = audio(); if (!ctx) return;
    var t = ctx.currentTime + 0.16;
    var o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(58, t + 0.11);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.18);
  }
  function sfxBell() {
    var ctx = audio(); if (!ctx) return;
    var t = ctx.currentTime + 0.28;
    [1, 2.74, 5.42, 8.1].forEach(function (mult, i) {
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = 632 * mult * (1 + (i ? 0.004 : 0));
      var g = ctx.createGain();
      var peak = 0.16 / (i + 1.4);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6 / (i * 0.55 + 1));
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 3);
    });
  }

  /* ============================================================= analytics
     Cookieless counts live in js/analytics.js - see ENDPOINT there.      */
  function track(event, label) {
    if (window.Analytics) window.Analytics.event(event, label);
  }

  /* ================================================================== utils */
  function fmt(s) {
    s = Math.max(0, Math.floor(s || 0));
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }
  function toast(msg, ms) {
    el.toast.textContent = msg;
    el.toast.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.toast.classList.remove('is-on'); }, ms || 2600);
  }
  function station() { return state.stations[state.si]; }
  function track_() { return state.queue[state.ti]; }

  /* ================================================= the host card + speech */
  function showCard(line) {
    el.hostDev.textContent = line.dev;
    el.hostRom.textContent = line.rom;
    el.hostEn.textContent = line.en;
  }
  function say(line) {
    if (!line) return Promise.resolve();
    if (!state.voice) { showCard(line); return Promise.resolve(); }
    el.hostcard.classList.add('is-speaking');
    return Tai.speakLine(line, { onCard: showCard }).then(function () {
      el.hostcard.classList.remove('is-speaking');
    });
  }

  /**
   * Tai's lines, delivered without ever making the listener wait: with her
   * voice off the cards just appear (the next one a few seconds later) and
   * the song starts at once; with it on we let her finish speaking first.
   */
  function deliver(lines, mySeq) {
    lines = lines.filter(Boolean);
    if (!lines.length) return Promise.resolve();
    if (state.voice) return sayAll(lines, mySeq);
    showCard(lines[0]);
    lines.slice(1).forEach(function (line, i) {
      setTimeout(function () { if (mySeq === state.seq) showCard(line); }, (i + 1) * 4200);
    });
    return Promise.resolve();
  }
  /** speak a sequence of lines, bailing out if the dial moved meanwhile */
  function sayAll(lines, mySeq) {
    return lines.reduce(function (p, line) {
      return p.then(function () {
        if (mySeq !== state.seq) return;
        return say(line);
      });
    }, Promise.resolve());
  }

  /* ======================================================== the dial itself */
  function needlePos(i) {
    var n = state.stations.length;
    return ((i + 0.5) / n) * 100;
  }
  function paintDial(animate) {
    var pos = needlePos(state.si) + '%';
    if (!animate || reduceMotion) {
      var prev = el.needle.style.transition;
      el.needle.style.transition = 'none';
      el.needle.style.left = pos;
      void el.needle.offsetWidth;
      el.needle.style.transition = prev || '';
    } else {
      el.needle.style.left = pos;
    }
    Array.prototype.forEach.call(el.marks.children, function (b, i) {
      b.setAttribute('aria-selected', i === state.si ? 'true' : 'false');
      b.tabIndex = i === state.si ? 0 : -1;
    });
  }

  function buildDial() {
    el.marks.innerHTML = '';
    state.stations.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'dial__mark';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', 'false');
      b.setAttribute('aria-label', s.nameRoman + ' — ' + s.occasion);
      b.innerHTML = '<span>' + s.dialLabel + '</span>';
      b.addEventListener('click', function () { tune(i); });
      el.marks.appendChild(b);
    });

    // keyboard: arrows walk the dial like a real one
    el.marks.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var next = (state.si + d + state.stations.length) % state.stations.length;
      tune(next);
      el.marks.children[next].focus();
    });

    /* drag the dial with a thumb */
    var dragging = false, moved = false;
    function idxFromX(clientX) {
      var r = el.strip.getBoundingClientRect();
      var frac = Math.min(0.999, Math.max(0, (clientX - r.left) / r.width));
      return Math.floor(frac * state.stations.length);
    }
    el.strip.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.dial__mark')) return;   // taps on labels are clicks
      dragging = true; moved = false;
      el.strip.setPointerCapture(e.pointerId);
    });
    el.strip.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      moved = true;
      var r = el.strip.getBoundingClientRect();
      var frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      el.needle.style.transition = 'none';
      el.needle.style.left = (frac * 100) + '%';
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      el.needle.style.transition = '';
      var i = idxFromX(e.clientX);
      if (moved && i !== state.si) tune(i); else paintDial(true);
    }
    el.strip.addEventListener('pointerup', endDrag);
    el.strip.addEventListener('pointercancel', function () {
      dragging = false; el.needle.style.transition = ''; paintDial(true);
    });
  }

  /* ============================================================ the toran */
  function paintToran() {
    var s = station();
    el.radio.classList.toggle('has-toran', !!s.toran);
    if (!s.toran || el.toran.childElementCount) return;
    var html = '';
    for (var i = 0; i < 26; i++) {
      html += '<i class="' + (i % 4 === 3 ? 'leaf' : '') + '" style="animation-delay:' +
              (-(i * 0.17).toFixed(2)) + 's"></i>';
    }
    el.toran.innerHTML = html;
  }

  /* =========================================================== now playing */
  function paintPlate() {
    var s = station();
    el.plateName.textContent = s.name;
    el.plateTag.textContent = s.tagline + ' · ' + s.taglineRoman;
    el.plateOcc.textContent = s.occasion;
    el.npStation.textContent = s.nameRoman;
    document.title = s.nameRoman + ' — Marwari Radio';
  }
  function paintTrack() {
    var t = track_();
    el.npTitle.textContent = t.title;
    el.npRoman.textContent = t.titleRoman;
    el.npArtist.textContent = t.artist;
    el.npIndex.textContent = (state.ti + 1) + ' / ' + state.queue.length;
    el.npFill.style.width = '0%';
    el.npElapsed.textContent = '0:00';
    el.announce.textContent = 'Now playing: ' + t.titleRoman + ' by ' + t.artist +
                              ', on ' + station().nameRoman;
  }

  /* ============================================================== playback */
  function playCurrent() {
    paintTrack();
    var t = track_();
    TrackSource.loadTrack(t.source);
    TrackSource.play();
    state.playing = true;
    el.radio.classList.add('is-playing', 'is-live');
    el.btnPlay.setAttribute('aria-label', 'Pause');
    if (!state.listenedFrom) state.listenedFrom = Date.now();
  }

  function advance(opts) {
    opts = opts || {};
    var mySeq = ++state.seq;
    state.ti = (state.ti + 1) % state.queue.length;
    state.sincePatter++;

    var lines = [];
    if (opts.dead) lines.push(Tai.line('unavailable'));
    if (opts.auto && !opts.dead && state.sincePatter >= state.patterEvery) {
      lines.push(Tai.line('between'));
      state.sincePatter = 0;
      state.patterEvery = 2 + Math.floor(Math.random() * 2);
    }
    if (!lines.length) { playCurrent(); return; }
    deliver(lines, mySeq).then(function () {
      if (mySeq === state.seq) playCurrent();
    });
  }

  /* ================================================================== tune */
  function tune(i, opts) {
    opts = opts || {};
    if (i === state.si && state.started && !opts.force) return;
    var first = !state.started;
    state.si = i;
    state.started = true;
    state.queue = station().tracks.slice();
    // a radio is already mid-programme when you switch it on
    state.ti = Math.floor(Math.random() * state.queue.length);
    state.sincePatter = 0;
    state.deadRun = 0;

    var mySeq = ++state.seq;
    Tai.shutUp();
    sfxStatic(); sfxClunk();
    if (station().bell) sfxBell();

    paintDial(!first);
    paintPlate();
    paintToran();
    paintTrack();

    var url = new URL(location.href);
    url.searchParams.set('channel', station().id);
    history.replaceState(null, '', url);

    track('station-tune', station().id);

    var lines = [ first ? Tai.line('welcome') : Tai.line('tune'), Tai.stationLine(station().id) ];
    deliver(lines, mySeq).then(function () {
      if (mySeq === state.seq) playCurrent();
    });
  }

  /* ====================================================== Tai's voice switch */
  function paintVoice() {
    var on = state.voice;
    el.btnVoice.dataset.on = String(on);
    el.btnVoice.setAttribute('aria-pressed', String(on));
    el.btnVoiceState.textContent = on ? 'चालू · on' : 'बंद · off';
    if (on && !Tai.hasVoice()) {
      el.btnVoiceState.textContent = 'आवाज़ कोनी · no voice';
    }
  }
  function toggleVoice() {
    state.voice = !state.voice;
    try { localStorage.setItem('mr:voice', state.voice ? 'on' : 'off'); } catch (e) {}
    paintVoice();
    track('voice-toggle', state.voice ? 'on' : 'off');
    if (!state.voice) {
      Tai.shutUp();
      el.hostcard.classList.remove('is-speaking');
      toast('ताई अब चुपचाप — Tai now speaks on the card only');
    } else if (!Tai.hasVoice()) {
      toast('इस डिवाइस पे हिंदी आवाज़ कोनी — no Hindi voice on this device');
    } else {
      say(Tai.line('welcome'));
    }
  }

  /* ============================================================ the gate */
  function openGate() {
    var s = station();
    var greet = Tai.line('welcome');
    el.gateLine.textContent = greet.dev + '  ' + (s ? '(' + s.name + ')' : '');
    el.gateNote.textContent = state.voice
      ? 'Tai will greet you, then the songs start.'
      : "Tai's lines show on a card. Her voice is off — there's a switch under it.";
  }
  function closeGate() {
    el.gate.hidden = true;
    setTimeout(function () { el.gate.style.display = 'none'; }, 520);
  }

  /* ========================================================= sleep timer */
  function setSleep(min) {
    clearTimeout(state.sleepTimer);
    state.sleepMin = min;
    state.sleepAt = min ? Date.now() + min * 60000 : 0;
    el.sleepTag.textContent = min ? min + 'm' : '';
    el.btnSleep.dataset.on = min ? 'true' : 'false';
    Array.prototype.forEach.call(el.sheet.querySelectorAll('.chip'), function (c) {
      c.dataset.on = (Number(c.dataset.min) === min && min) ? 'true' : 'false';
    });
    if (!min) { toast('टाइमर बंद — timer off'); return; }
    toast(min + ' मिनट पछै रेडियो बंद — off in ' + min + ' min');
    track('sleep-timer', String(min));
    state.sleepTimer = setTimeout(fadeAndSignOff, min * 60000);
  }

  function fadeAndSignOff() {
    var mySeq = ++state.seq;
    var vol = 100;
    var fade = setInterval(function () {
      vol -= 5;
      TrackSource.setVolume(Math.max(0, vol));
      if (vol <= 0) {
        clearInterval(fade);
        TrackSource.pause();
        state.playing = false;
        el.radio.classList.remove('is-playing', 'is-live');
        el.btnPlay.setAttribute('aria-label', 'Play');
        state.signedOffAt = Date.now();
        say(Tai.line('signoff')).then(function () {
          if (mySeq === state.seq) TrackSource.setVolume(100);
        });
        if (!state.voice) TrackSource.setVolume(100);
        setSleep(0);
      }
    }, 300);
  }

  /* =============================================================== share */
  function shareStation() {
    var s = station();
    /* /s/<station>/ is a tiny page carrying that station's own Open Graph
       tags, so the link unfurls with the right card in a WhatsApp group and
       then bounces the reader to ?channel=<station>. */
    var base = location.origin + location.pathname.replace(/index\.html?$/, '');
    var url = base + 's/' + s.id + '/';
    var text = 'म्हारी याद आ गी — ' + s.name + ' on Marwari Radio. राम राम सा।\n' +
               'Mhari yaad aa gi — ' + s.nameRoman + ' on Marwari Radio. Ram ram sa.';
    track('share', s.id);
    if (navigator.share) {
      navigator.share({ title: 'Marwari Radio — ' + s.nameRoman, text: text, url: url })
        .catch(function () { copy(url, text); });
    } else {
      copy(url, text);
    }
  }
  function copy(url, text) {
    var payload = text + '\n' + url;
    var done = function () { toast('लिंक कॉपी हो ग्यो — link copied, paste it in the family group'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(payload).then(done, function () { fallbackCopy(payload, done); });
    } else {
      fallbackCopy(payload, done);
    }
  }
  function fallbackCopy(payload, done) {
    var ta = document.createElement('textarea');
    ta.value = payload;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); }
    catch (e) { toast('कॉपी कोनी हुयो — copy this: ' + payload.split('\n').pop(), 6000); }
    document.body.removeChild(ta);
  }

  /* ============================================================== wiring */
  function wire() {
    el.btnPlay.addEventListener('click', function () {
      if (state.playing) {
        TrackSource.pause();
        Tai.shutUp();
        state.playing = false;
        el.radio.classList.remove('is-playing', 'is-live');
        el.btnPlay.setAttribute('aria-label', 'Play');
        el.hostcard.classList.remove('is-speaking');
        // switching the radio off deserves a goodbye, but only once in a while
        var listened = state.listenedFrom ? Date.now() - state.listenedFrom : 0;
        if (listened > 45000 && Date.now() - state.signedOffAt > 300000) {
          state.signedOffAt = Date.now();
          say(Tai.line('signoff'));
        }
      } else {
        track('play', station().id);
        TrackSource.play();
        state.playing = true;
        el.radio.classList.add('is-playing', 'is-live');
        el.btnPlay.setAttribute('aria-label', 'Pause');
      }
    });

    el.btnNext.addEventListener('click', function () {
      track('next-track', station().id);
      advance({ auto: false });
    });

    el.btnSleep.addEventListener('click', function () {
      var open = el.sheet.hidden;
      el.sheet.hidden = !open;
      el.btnSleep.setAttribute('aria-expanded', String(open));
    });
    Array.prototype.forEach.call(el.sheet.querySelectorAll('.chip'), function (c) {
      c.addEventListener('click', function () {
        setSleep(Number(c.dataset.min));
        el.sheet.hidden = true;
        el.btnSleep.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('click', function (e) {
      if (el.sheet.hidden) return;
      if (e.target.closest('#sleepsheet') || e.target.closest('#btn-sleep')) return;
      el.sheet.hidden = true;
      el.btnSleep.setAttribute('aria-expanded', 'false');
    });

    el.btnShare.addEventListener('click', shareStation);
    el.btnVoice.addEventListener('click', toggleVoice);

    document.addEventListener('keydown', function (e) {
      if (e.target.matches('input, textarea')) return;
      if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); el.btnPlay.click(); }
      if (e.key === 'Escape' && !el.sheet.hidden) {
        el.sheet.hidden = true;
        el.btnSleep.setAttribute('aria-expanded', 'false');
      }
    });

    TrackSource.on('ended', function () {
      state.deadRun = 0;
      advance({ auto: true });
    });

    TrackSource.on('error', function (info) {
      track('dead-track', (track_() && track_().titleRoman) || 'unknown');
      console.warn('[radio] track unavailable:', info && info.reason, track_());
      state.deadRun++;
      if (state.deadRun > state.queue.length) {
        toast('रेडियो में कुछ गड़बड़ है — no tracks would play. Check the network.', 6000);
        state.playing = false;
        el.radio.classList.remove('is-playing', 'is-live');
        return;
      }
      advance({ auto: true, dead: true });
    });

    /* The embed is fine, the browser just wants a tap before it makes sound. */
    TrackSource.on('blocked', function () {
      state.playing = false;
      el.radio.classList.remove('is-playing', 'is-live');
      el.btnPlay.setAttribute('aria-label', 'Play');
      toast('बजाबा सारू ▶ दबाओ — tap play to start');
    });

    TrackSource.on('progress', function (p) {
      el.npElapsed.textContent = fmt(p.time);
      if (p.duration > 0) el.npFill.style.width = ((p.time / p.duration) * 100).toFixed(1) + '%';
    });

    window.addEventListener('beforeunload', function () { Tai.shutUp(); });
  }

  /* ================================================================= boot */
  function chosenStation() {
    var want = new URLSearchParams(location.search).get('channel');
    var found = -1;
    state.stations.forEach(function (s, i) {
      if (want && (s.id === want || s.nameRoman.toLowerCase() === want.toLowerCase())) found = i;
    });
    if (found >= 0) return found;
    // no link: pick what the hour of day calls for
    var h = new Date().getHours();
    var byHour = h >= 4 && h < 10 ? 'bhakti' : (h >= 22 || h < 4) ? 'purani' : 'rail';
    var idx = 0;
    state.stations.forEach(function (s, i) { if (s.id === byHour) idx = i; });
    return idx;
  }

  fetch('stations.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (cfg) {
      state.stations = cfg.stations;
      buildDial();
      wire();
      state.si = chosenStation();
      paintDial(false);
      paintPlate();
      paintToran();
      paintVoice();
      openGate();

      if (window.Analytics) {
        window.Analytics.init();
        window.Analytics.pageview(station().id);
      }

      el.gateBtn.addEventListener('click', function () {
        audio();                 // AudioContext must be born of a gesture
        TrackSource.init();
        closeGate();
        tune(state.si, { force: true });
      });
    })
    .catch(function (err) {
      console.error(err);
      el.gateLine.textContent = 'stations.json कोनी मिली — serve this folder over http:// (not file://).';
      el.gateBtn.hidden = true;
    });
})();
