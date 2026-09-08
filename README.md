# Marwari Radio — म्हारो रेडियो

A mobile-first web jukebox of **occasion-based** Marwari/Rajasthani stations, hosted by
**Tai** — a warm elder whose lines are written in Marwari, not Hindi, not English.
It is a radio dial, not a search box: you tune in and it plays.

Five stations, each an occasion rather than a genre:

| Station | Marwari tagline | The occasion |
|---|---|---|
| भक्ति बेला · Bhakti Bela | सुबह सुबह प्रभु को नाम | Morning bhajans and aarti, like home at 7 AM |
| शादी संगीत · Shaadi Sangeet | हळदी चढ़ गी, गीत रुकै नीं | Mehndi and sangeet — the aunties' circle with the dholak |
| गणगौर अर तीज · Gangaur & Teej | लहरिया पहर लो सा | Festival geet, swings, new leheriya and ghevar |
| रेल यात्रा · Rail Yatra | चालो, घर चालां | The summer train to Rajasthan, tiffin of puri-achar |
| पुराणी यादें · Purani Yaadein | दुकान रो रेडियो | The Lata–Kishore–Mukesh era, hummed at the shop counter |

## Run it

```bash
python3 -m http.server 8765
```

Then open <http://localhost:8765>. It must be served over `http://` — the station
config is fetched, so `file://` will not work.

## The three seams

Everything the spec asked to keep swappable lives behind exactly one door each:

- **Station content** → [`stations.json`](stations.json). Names, Marwari taglines, occasions and the
  track lists. It is the only file you edit to change what plays.
- **Where audio comes from** → `TrackSource` in [`js/player.js`](js/player.js). The app only ever calls
  `loadTrack(source)` / `play` / `pause` / `setVolume` and listens for `ended` / `error` / `blocked`.
  Today every source is `{ kind: 'youtube', youtubeId }`; licensed audio means adding one branch.
- **Tai's voice** → `Tai.speakLine(line)` in [`js/host.js`](js/host.js). One function, one promise. Point it at
  ElevenLabs and nothing else changes. All of her lines live in the same file, ≥4 variants per
  slot, never repeating back-to-back.

## Tai's voice is off by default

Her lines always appear on the green card in Devanagari **and** Roman **and** English — that
card is the subtitle, so a deaf listener and a non-reader both get the whole thing. The
*spoken* audio is off by default, because hearing a station announce every song change wears
thin, and waiting for her to finish before the music starts is worse. The switch under the
card turns her voice on (browser `SpeechSynthesis`, `hi-IN`, rate 0.9); with the voice off the
song starts immediately.

## No music is hosted here

Hosting Bollywood or folk recordings would be piracy. Every track streams from a **YouTube
IFrame embed** with the video hidden — the radio UI is ours, the stream is YouTube's. Each ID
in `stations.json` was checked for `playableInEmbed: true` before it went in. If one dies
later, Tai says *"यो गीत अबै कोनी मिलै — अगलो सुणाऊं"* and the dial moves on; a dead embed is
never shown.

## Sharing

Each station has its own unfurl page at `/s/<station>/` carrying that station's Open Graph
title, description and 1200×630 card, so a link dropped into a WhatsApp family group shows
*that* station before bouncing the reader to `/?channel=<station>`. Plain `?channel=` deep
links work too and land tuned, with the welcome line.

Regenerate the cards and share pages after editing `stations.json`:

```bash
python3 scripts/build.py
```

Deploying somewhere other than GitHub Pages? The absolute URLs are rewritten from one variable:

```bash
SITE_URL=https://your.domain python3 scripts/build.py
```

## Analytics

Cookieless [GoatCounter](https://www.goatcounter.com), configured in one constant in
[`js/analytics.js`](js/analytics.js) (`https://pratikpoddar.goatcounter.com/count`). It honours
Do Not Track and Global Privacy Control, and sends one pageview plus these events:
`station-tune`, `play`, `next-track`, `share`, `sleep-timer`, `voice-toggle`, `dead-track`.
Register that site code at goatcounter.com for the counts to land; empty the constant to
disable analytics entirely.

## Accessibility

Real buttons throughout, keyboard reachable with visible focus, arrow keys walk the dial,
Space toggles play. Track changes are announced through an `aria-live` region. Tai's speech
always has its text card. `prefers-reduced-motion` stops the needle animation and the garland
sway.

## What is deliberately absent

No accounts, no playlists, no search, no history, no settings page. Ship the kitchen radio first.
