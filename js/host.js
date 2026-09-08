/* ===========================================================================
   Tai - the voice of Marwari Radio.
   Every line she says lives here, and every word she speaks leaves through
   exactly one door: speakLine(). Swap that one function for ElevenLabs (or
   any real TTS) and nothing else in the app has to change.
   =========================================================================== */

(function () {
  'use strict';

  /* --- What Tai says -------------------------------------------------------
     dev = Devanagari (this is what the TTS voice is given - it pronounces
           Marwari written in Devanagari far better than Roman text)
     rom = Roman transliteration (this is what goes on the radio card)
     en  = English gloss (small print, so the grandkids follow along)
     Minimum four variants per slot; the picker never repeats back-to-back.
  ------------------------------------------------------------------------- */
  var LINES = {
    welcome: [
      { dev: 'राम राम सा! पधारो म्हारे देस। आज कई सुणोगा?', rom: 'Ram ram sa! Padharo mhare des. Aaj kai sunoga?', en: 'Greetings! Welcome. What shall we hear today?' },
      { dev: 'घणी खम्मा! रेडियो चालू कर दियो, अब घर जैसो लागैगो।', rom: 'Ghani khamma! Radio chalu kar diyo, ab ghar jaiso lagego.', en: 'Many respects! The radio is on - now it will feel like home.' },
      { dev: 'आवो आवो, बैठो। थोड़ा गीत सुणां, थोड़ी बातां करां।', rom: 'Aavo aavo, baitho. Thoda geet sunaan, thodi bataan karaan.', en: 'Come, sit. We will hear a few songs and talk a little.' },
      { dev: 'राम राम सा, लाडेसर! ताई रेडियो पे आ गी।', rom: 'Ram ram sa, ladesar! Tai radio pe aa gi.', en: 'Ram ram, my dear! Tai is on the radio.' },
      { dev: 'खम्मा घणी! सुर मिला दियो — अब सुणो, मन हळको हो जासी।', rom: 'Khamma ghani! Sur mila diyo - ab suno, man halko ho jasi.', en: 'Greetings! The dial is tuned - listen, your heart will lighten.' }
    ],

    /* One set per station, spoken right after the welcome on tune-in. */
    station: {
      bhakti: [
        { dev: 'सुबह सुबह प्रभु को नाम — दिन शुभ रहैगो, सा।', rom: 'Subah subah Prabhu ko naam - din shubh rahego, sa.', en: "God's name first thing in the morning - the day will go well." },
        { dev: 'आरती की थाळी तैयार कर लो, भजन चालू।', rom: 'Aarti ki thali taiyar kar lo, bhajan chalu.', en: 'Get the aarti thali ready, the bhajans are starting.' },
        { dev: 'हनुमानजी को नाम लो, सगळो काम बण जासी।', rom: 'Hanumanji ko naam lo, sagalo kaam ban jasi.', en: "Say Hanuman's name, every task will come good." },
        { dev: 'दीवो बाळ दियो? चालो, प्रभु ने याद करां।', rom: 'Deevo baal diyo? Chalo, Prabhu ne yaad karaan.', en: 'Have you lit the lamp? Come, let us remember God.' }
      ],
      shaadi: [
        { dev: 'हळदी चढ़ गी है, गीत रुकै नीं!', rom: 'Haldi chadhi hai, geet rukai nee!', en: "The haldi is on, the songs don't stop!" },
        { dev: 'ढोलक ले आओ, बीनणी रा गीत गावां।', rom: 'Dholak le aao, beenani ra geet gavaan.', en: "Bring the dholak, let us sing the bride's songs." },
        { dev: 'बन्ना-बन्नी रा गीत चालू — नाचो, थकबा को दिन कोनी।', rom: 'Banna-banni ra geet chalu - nacho, thakba ko din koni.', en: 'The banna-banni songs are on - dance, this is no day to be tired.' },
        { dev: 'सा, जीमण पछै — पहलां संगीत!', rom: 'Sa, jeeman pachhai - pahlaan sangeet!', en: 'Dinner later - sangeet first!' }
      ],
      gangaur: [
        { dev: 'गणगौर आ गी, लहरिया पहर लो सा।', rom: 'Gangaur aa gi, leheriya pahar lo sa.', en: 'Gangaur is here, put on your leheriya.' },
        { dev: 'गोर गोर गोमती, ईसर पूजे पार्वती — गावो सागै।', rom: 'Gor gor gomti, Isar puje Parvati - gaavo sagai.', en: 'Gor gor gomti, Parvati worships Isar - sing along.' },
        { dev: 'तीज को झूलो पड़ ग्यो, घेवर मंगा लियो?', rom: 'Teej ko jhoolo pad gyo, ghevar manga liyo?', en: 'The Teej swing is up - did you order the ghevar?' },
        { dev: 'सावण की बूंदां अर ये गीत — दोनूं मीठा।', rom: 'Sawan ki boondaan ar ye geet - dono meetha.', en: 'The rains of Sawan and these songs - both sweet.' }
      ],
      rail: [
        { dev: 'पूरी-अचार पैक हो ग्यो? चालो, घर चालां।', rom: 'Puri-achar pack ho gyo? Chalo, ghar chalaan.', en: "Is your puri-achar packed? Come, let's go home." },
        { dev: 'गाड़ी चाली — खिड़की रे कने बैठ जावो सा।', rom: 'Gaadi chali - khidki re kane baith javo sa.', en: 'The train has started - go sit by the window.' },
        { dev: 'रेत रो देस बुलावै — आँख मीच लो, पूग जासां।', rom: 'Ret ro des bulavai - aankh meech lo, poog jasaan.', en: 'The land of sand is calling - close your eyes, we will arrive.' },
        { dev: 'केसरिया बालम, आवो नीं... सुणो, गळो भर जासी।', rom: 'Kesariya balam, aavo ni... suno, galo bhar jasi.', en: 'Kesariya balam, do come... listen, your throat will catch.' }
      ],
      purani: [
        { dev: 'दुकान रो रेडियो चालू — बही खातो अर ये गीत।', rom: 'Dukaan ro radio chalu - bahi khato ar ye geet.', en: 'The shop radio is on - the ledger and these songs.' },
        { dev: 'लता-किशोर लगा दिया, पुराणी याद ताजी।', rom: 'Lata-Kishore laga diya, purani yaad taazi.', en: 'I put on Lata and Kishore - the old memories are fresh.' },
        { dev: 'ये गीत थारा बाबूजी गुनगुनाया करता।', rom: 'Ye geet thara babuji gungunaya karta.', en: 'Your father used to hum these songs.' },
        { dev: 'आराम सूं सुणो सा, जल्दी कांई है।', rom: 'Aaram su suno sa, jaldi kaanyi hai.', en: 'Listen at your ease - what is the hurry?' }
      ]
    },

    between: [
      { dev: 'आगै कोनी सुणो?', rom: 'Aage koni suno?', en: "Won't you hear more?" },
      { dev: 'औ एक सुणाऊं?', rom: 'Au ek sunaun?', en: 'Shall I play one more?' },
      { dev: 'यो गीत तो म्हारी माँ गाया करती।', rom: 'Yo geet toh mhari maa gaya karti.', en: 'My mother used to sing this one.' },
      { dev: 'चाय बण गी? सुणतां सुणतां पी लो।', rom: 'Chai ban gi? Suntaan suntaan pee lo.', en: 'Is the tea ready? Drink it while you listen.' },
      { dev: 'सुणो सुणो, आगलो अर चोखो है।', rom: 'Suno suno, aaglo ar chokho hai.', en: 'Listen, the next one is even better.' },
      { dev: 'थोड़ो अर बैठो सा, जल्दी कांई है।', rom: 'Thodo ar baitho sa, jaldi kaanyi hai.', en: 'Sit a little longer - what is the hurry?' },
      { dev: 'आँख मीच के सुणो — घर याद आसी।', rom: 'Aankh meech ke suno - ghar yaad aasi.', en: 'Listen with your eyes shut - home will come back to you.' },
      { dev: 'यो सुण के म्हारो मन भर आयो।', rom: 'Yo sun ke mharo man bhar aayo.', en: 'Hearing this, my heart filled up.' }
    ],

    /* Spoken when the dial moves to another station. */
    tune: [
      { dev: 'सुई घुमा दी — अब आ सुणो।', rom: 'Sui ghuma di - ab aa suno.', en: 'I moved the needle - now hear this.' },
      { dev: 'स्टेशन बदल्यो सा, धीरे धीरे...', rom: 'Station badalyo sa, dheere dheere...', en: 'Changed the station - gently now...' },
      { dev: 'चालो दूजै स्टेशन पे।', rom: 'Chalo doojai station pe.', en: 'Come along to the other station.' },
      { dev: 'आ लो, नयो सुर मिल ग्यो।', rom: 'Aa lo, nayo sur mil gyo.', en: 'There - a new tune has come in.' }
    ],

    /* Spoken when a video is region-blocked, removed or refuses to embed. */
    unavailable: [
      { dev: 'यो गीत अबै कोनी मिलै — अगलो सुणाऊं।', rom: 'Yo geet abai koni milai - aglo sunaun.', en: "That one isn't available - I'll play the next." },
      { dev: 'आ कैसेट खराब हो गी, दूजी लगावूं।', rom: 'Aa cassette kharab ho gi, dooji lagavun.', en: 'This cassette has gone bad, let me put another.' },
      { dev: 'यो तो गुम हो ग्यो सा — आगै चालां।', rom: 'Yo toh gum ho gyo sa - aage chalaan.', en: 'This one has gone missing - let us move on.' },
      { dev: 'सिग्नल पकड़ में कोनी आयो, अगलो गीत।', rom: 'Signal pakad mein koni aayo, aglo geet.', en: "The signal won't hold - next song." }
    ],

    signoff: [
      { dev: 'घणी खम्मा। कल फेर मिलां।', rom: 'Ghani khamma. Kal pher milaan.', en: 'Many respects. We meet again tomorrow.' },
      { dev: 'सो जावो सा, रेडियो बंद करूं। राम राम।', rom: 'So javo sa, radio band karun. Ram ram.', en: 'Go to sleep, I am switching the radio off. Ram ram.' },
      { dev: 'आँख भारी हो गी — सुख सूं सोवो, भजन याद रखो।', rom: 'Aankh bhaari ho gi - sukh su sovo, bhajan yaad rakho.', en: 'Your eyes are heavy - sleep well, keep the bhajans in mind.' },
      { dev: 'जय श्री कृष्ण। घणी खम्मा, कल फेर।', rom: 'Jai Shri Krishna. Ghani khamma, kal pher.', en: 'Jai Shri Krishna. Many respects, until tomorrow.' }
    ]
  };

  /* --- Rotation: pick a variant, never the one we just used --------------- */
  var lastPicked = {};
  function pick(slotKey, list) {
    if (!list || !list.length) return null;
    if (list.length === 1) return list[0];
    var i, guard = 0;
    do {
      i = Math.floor(Math.random() * list.length);
      guard++;
    } while (i === lastPicked[slotKey] && guard < 20);
    lastPicked[slotKey] = i;
    return list[i];
  }

  /* --- The one and only speech door -------------------------------------- */
  var voice = null;
  var voiceChecked = false;
  var speaking = false;

  function findVoice() {
    if (voiceChecked && voice) return voice;
    if (!('speechSynthesis' in window)) { voiceChecked = true; return null; }
    var all = window.speechSynthesis.getVoices() || [];
    // hi-IN first, then any Hindi, then any Indian-English voice as a last resort.
    voice =
      all.filter(function (v) { return /^hi[-_]IN$/i.test(v.lang); })[0] ||
      all.filter(function (v) { return /^hi/i.test(v.lang); })[0] ||
      all.filter(function (v) { return /^en[-_]IN$/i.test(v.lang); })[0] ||
      null;
    if (all.length) voiceChecked = true;
    return voice;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.addEventListener('voiceschanged', function () {
      voiceChecked = false;
      findVoice();
    });
    findVoice();
  }

  /**
   * speakLine(line, opts) -> Promise that resolves when Tai has finished.
   * This is the ONLY place speech is produced. To move to a real TTS service,
   * replace the body: fetch the audio, play it, resolve when it ends. The card
   * on screen is driven by opts.onCard and must always be shown - it is the
   * subtitle, and for a device with no Hindi voice it is the whole experience.
   */
  function speakLine(line, opts) {
    opts = opts || {};
    if (!line) return Promise.resolve();
    if (typeof opts.onCard === 'function') opts.onCard(line);

    // Reading time for the silent fallback: ~14 chars/second, floor 2.2s.
    var readMs = Math.max(2200, Math.min(9000, line.dev.length * 90));

    if (!('speechSynthesis' in window) || !findVoice() || opts.silent) {
      return new Promise(function (resolve) { setTimeout(resolve, readMs); });
    }

    return new Promise(function (resolve) {
      var done = false;
      function finish() { if (!done) { done = true; speaking = false; resolve(); } }
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(line.dev);
        u.voice = findVoice();
        u.lang = u.voice.lang || 'hi-IN';
        u.rate = 0.9;
        u.pitch = 1.0;
        u.volume = 1.0;
        u.onend = finish;
        u.onerror = finish;
        speaking = true;
        window.speechSynthesis.speak(u);
        // Some engines never fire onend; never let the radio hang on it.
        setTimeout(finish, readMs + 6000);
      } catch (e) {
        finish();
      }
    });
  }

  function shutUp() {
    try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) {}
    speaking = false;
  }

  window.Tai = {
    lines: LINES,
    /** slot: 'welcome' | 'between' | 'tune' | 'unavailable' | 'signoff' */
    line: function (slot) { return pick(slot, LINES[slot]); },
    /** station-specific intro line for a station id */
    stationLine: function (stationId) {
      return pick('station:' + stationId, LINES.station[stationId]);
    },
    speakLine: speakLine,
    shutUp: shutUp,
    hasVoice: function () { return !!findVoice(); },
    isSpeaking: function () { return speaking; }
  };
})();
