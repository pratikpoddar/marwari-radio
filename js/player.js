/* ===========================================================================
   The track source adapter.
   The rest of the app only ever calls loadTrack(source) / play / pause /
   setVolume, and listens for 'ended' and 'error'. Today every source is
   { kind: 'youtube', youtubeId: '...' } played through a hidden IFrame
   player. To move to licensed audio, add a branch in loadTrack() (and a
   matching backend in _backends) - nothing above this file changes.
   =========================================================================== */

(function () {
  'use strict';

  var listeners = { ended: [], error: [], playing: [], paused: [], progress: [], blocked: [] };
  function emit(name, payload) {
    (listeners[name] || []).forEach(function (fn) {
      try { fn(payload); } catch (e) { console.error(e); }
    });
  }

  var yt = null;              // the YT.Player instance
  var ytReady = null;         // Promise resolved once the player exists
  var current = null;         // the source we last asked for
  var wantPlay = false;       // did the user ask for sound?
  var watchdog = null;        // catches embeds that never start
  var progressTimer = null;
  var ended = false;

  /* --- YouTube backend --------------------------------------------------- */

  function loadApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (loadApi._p) return loadApi._p;
    loadApi._p = new Promise(function (resolve, reject) {
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof prev === 'function') prev();
        resolve();
      };
      var s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = function () { reject(new Error('youtube-api-blocked')); };
      document.head.appendChild(s);
      setTimeout(function () { reject(new Error('youtube-api-timeout')); }, 15000);
    });
    return loadApi._p;
  }

  function ensurePlayer() {
    if (ytReady) return ytReady;
    ytReady = loadApi().then(function () {
      return new Promise(function (resolve, reject) {
        yt = new window.YT.Player('yt-host', {
          height: '180',
          width: '320',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            iv_load_policy: 3,
            origin: location.origin
          },
          events: {
            onReady: function () { resolve(yt); },
            onStateChange: onState,
            onError: function (e) { fail('yt-' + (e && e.data)); }
          }
        });
        setTimeout(function () { if (!yt || !yt.playVideo) reject(new Error('player-timeout')); }, 15000);
      });
    });
    return ytReady;
  }

  function onState(e) {
    var S = window.YT.PlayerState;
    if (e.data === S.PLAYING) {
      clearWatchdog();
      ended = false;
      startProgress();
      emit('playing', current);
    } else if (e.data === S.PAUSED) {
      stopProgress();
      emit('paused', current);
    } else if (e.data === S.ENDED) {
      stopProgress();
      if (!ended) { ended = true; emit('ended', current); }
    } else if (e.data === S.BUFFERING) {
      // Buffering means the embed is alive; give it room to breathe.
      clearWatchdog();
      armWatchdog(25000);
    }
  }

  function fail(reason) {
    clearWatchdog();
    stopProgress();
    emit('error', { source: current, reason: reason });
  }

  function armWatchdog(ms) {
    clearWatchdog();
    watchdog = setTimeout(function () {
      /* Nothing played. Two very different reasons, and confusing them would
         make the radio skip good songs: if the video's metadata arrived, the
         embed is alive and the browser is simply refusing to autoplay - keep
         the track and let the app ask for a tap. No metadata means the embed
         really is dead, and the host can move on. */
      var dur = 0;
      try { dur = (yt && yt.getDuration && yt.getDuration()) || 0; } catch (e) {}
      clearWatchdog();
      if (dur > 0) {
        wantPlay = false;
        emit('blocked', { source: current });
      } else {
        fail('no-start');
      }
    }, ms || 12000);
  }
  function clearWatchdog() {
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
  }

  function startProgress() {
    stopProgress();
    progressTimer = setInterval(function () {
      if (!yt || !yt.getCurrentTime) return;
      try {
        emit('progress', { time: yt.getCurrentTime() || 0, duration: yt.getDuration() || 0 });
      } catch (e) {}
    }, 500);
  }
  function stopProgress() {
    if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
  }

  /* --- Public adapter ---------------------------------------------------- */

  var Player = {
    on: function (name, fn) {
      if (!listeners[name]) listeners[name] = [];
      listeners[name].push(fn);
      return Player;
    },

    /** Warm up the backend. Call it from the first user tap. */
    init: function () { return ensurePlayer(); },

    /**
     * loadTrack(source) - source is whatever stations.json put in track.source.
     * Resolves once the backend has accepted the track; 'error' fires later if
     * the embed turns out to be dead.
     */
    loadTrack: function (source) {
      current = source;
      ended = false;
      if (!source || source.kind !== 'youtube' || !source.youtubeId) {
        setTimeout(function () { fail('unsupported-source'); }, 0);
        return Promise.resolve();
      }
      return ensurePlayer().then(function () {
        try {
          if (wantPlay) {
            yt.loadVideoById(source.youtubeId);
            armWatchdog(12000);
          } else {
            yt.cueVideoById(source.youtubeId);
          }
          Player.setVolume(100);
        } catch (e) {
          fail('load-threw');
        }
      }).catch(function () { fail('backend-unavailable'); });
    },

    play: function () {
      wantPlay = true;
      return ensurePlayer().then(function () {
        try {
          yt.playVideo();
          if (yt.getPlayerState && yt.getPlayerState() !== window.YT.PlayerState.PLAYING) {
            armWatchdog(12000);
          }
        } catch (e) { fail('play-threw'); }
      }).catch(function () { fail('backend-unavailable'); });
    },

    pause: function () {
      wantPlay = false;
      clearWatchdog();
      if (yt && yt.pauseVideo) { try { yt.pauseVideo(); } catch (e) {} }
    },

    stop: function () {
      wantPlay = false;
      clearWatchdog();
      stopProgress();
      if (yt && yt.stopVideo) { try { yt.stopVideo(); } catch (e) {} }
    },

    setVolume: function (v) {
      if (yt && yt.setVolume) { try { yt.setVolume(Math.max(0, Math.min(100, v))); } catch (e) {} }
    },

    isPlaying: function () {
      try {
        return !!(yt && yt.getPlayerState && yt.getPlayerState() === window.YT.PlayerState.PLAYING);
      } catch (e) { return false; }
    }
  };

  window.TrackSource = Player;
})();
