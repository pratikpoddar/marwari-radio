/* ===========================================================================
   Lightweight, cookieless analytics (GoatCounter).
   No cookies, no fingerprint, no personal data - just a path and a referrer.
   Every event in the app goes through Analytics.event(); if ENDPOINT is
   emptied out, nothing is loaded and nothing is sent.
   =========================================================================== */

(function () {
  'use strict';

  var ENDPOINT = 'https://pratikpoddar.goatcounter.com/count';

  var queue = [];
  var loaded = false;
  var off = false;

  /* Honour Do Not Track / Global Privacy Control before anything loads. */
  try {
    off = navigator.doNotTrack === '1' ||
          window.doNotTrack === '1' ||
          navigator.globalPrivacyControl === true;
  } catch (e) {}

  function ready() {
    return !!(window.goatcounter && typeof window.goatcounter.count === 'function');
  }

  function flush() {
    if (!ready()) return;
    loaded = true;
    while (queue.length) {
      var hit = queue.shift();
      try { window.goatcounter.count(hit); } catch (e) {}
    }
  }

  function send(hit) {
    if (off || !ENDPOINT) return;
    if (loaded && ready()) {
      try { window.goatcounter.count(hit); } catch (e) {}
    } else {
      queue.push(hit);           // count.js has not landed yet
    }
  }

  var Analytics = {
    init: function () {
      if (off || !ENDPOINT) return;
      // we send our own pageview so the tuned station rides along with it
      window.goatcounter = window.goatcounter || {};
      window.goatcounter.no_onload = true;
      window.goatcounter.no_events = true;

      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://gc.zgo.at/count.js';
      s.setAttribute('data-goatcounter', ENDPOINT);
      s.addEventListener('load', flush);
      document.head.appendChild(s);
    },

    /** One pageview, with the station that was actually tuned. */
    pageview: function (channel) {
      send({
        path: location.pathname + (channel ? '?channel=' + channel : ''),
        title: document.title,
        referrer: document.referrer
      });
    },

    /** event('station-tune', 'shaadi') -> /event/station-tune/shaadi */
    event: function (name, label) {
      var path = 'event/' + name + (label ? '/' + String(label).replace(/[^\w.-]+/g, '-') : '');
      send({ path: path, title: 'event: ' + name + (label ? ' ' + label : ''), event: true });
      if (window.console && console.debug) console.debug('[radio]', path);
    },

    enabled: function () { return !off && !!ENDPOINT; }
  };

  window.Analytics = Analytics;
})();
