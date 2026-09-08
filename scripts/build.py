#!/usr/bin/env python3
"""
Regenerates everything derived from stations.json:

  assets/og-<station>.png   one Open Graph card per station (+ og-image.png home)
  s/<station>/index.html    a tiny share page per station, so a link dropped in
                            a WhatsApp family group unfurls with THAT station's
                            name, tagline and artwork before bouncing the reader
                            to /?channel=<station>

Run it after editing stations.json:   python3 scripts/build.py
Needs Google Chrome (headless screenshots) and a local server on PORT.
"""
import json, os, pathlib, re, shutil, subprocess, sys, time, http.server, socketserver, threading, functools

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = os.environ.get("SITE_URL", "https://pratikpoddar.github.io/marwari-radio").rstrip("/")
PORT = int(os.environ.get("PORT", "8791"))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

cfg = json.loads((ROOT / "stations.json").read_text())
stations = cfg["stations"]


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def shot(url, out):
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
         "--force-device-scale-factor=1", "--window-size=1200,630",
         f"--screenshot={out}", "--virtual-time-budget=8000", url],
        check=True, capture_output=True,
    )
    print(f"  {out.relative_to(ROOT)}  ({out.stat().st_size // 1024} KB)")


SHARE_PAGE = """<!doctype html>
<html lang="mwr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{name} — Marwari Radio</title>
<link rel="canonical" href="{site}/?channel={id}">

<meta property="og:type" content="music.radio_station">
<meta property="og:site_name" content="Marwari Radio">
<meta property="og:locale" content="hi_IN">
<meta property="og:title" content="{name} — Marwari Radio">
<meta property="og:description" content="{tagline_roman} · {occasion}. ताई मारवाड़ी में बतळावै — Tai talks in Marwari between the songs.">
<meta property="og:url" content="{site}/s/{id}/">
<meta property="og:image" content="{site}/assets/og-{id}.png">
<meta property="og:image:secure_url" content="{site}/assets/og-{id}.png">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{name_roman} on Marwari Radio — a wooden radio with a brass tuning dial">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{name} — Marwari Radio">
<meta name="twitter:description" content="{tagline_roman} · {occasion}">
<meta name="twitter:image" content="{site}/assets/og-{id}.png">
<meta name="description" content="{tagline_roman} · {occasion}">
<meta name="theme-color" content="#4a0f18">
<link rel="icon" href="../../assets/favicon.svg" type="image/svg+xml">

<meta http-equiv="refresh" content="0; url=../../?channel={id}">
<style>
  body {{ margin:0; min-height:100vh; display:grid; place-items:center; text-align:center;
    background:#4a0f18; color:#f6ead0; font-family:Georgia,serif; padding:24px }}
  a {{ color:#f2cf62 }}
</style>
</head>
<body>
  <div>
    <p style="font-size:26px;margin:0 0 6px">{name}</p>
    <p style="opacity:.75;margin:0 0 18px">{tagline} · {tagline_roman}</p>
    <p><a href="../../?channel={id}">राम राम सा — रेडियो चालू करो →</a></p>
  </div>
  <script>location.replace('../../?channel=' + {id!r});</script>
</body>
</html>
"""

def main():
    httpd = serve()
    time.sleep(0.4)
    base = f"http://127.0.0.1:{PORT}"
    print("Open Graph cards:")
    shot(f"{base}/og-card.html", ROOT / "assets" / "og-image.png")
    for s in stations:
        shot(f"{base}/og-card.html?station={s['id']}", ROOT / "assets" / f"og-{s['id']}.png")

    print("Share pages:")
    for s in stations:
        out = ROOT / "s" / s["id"] / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(SHARE_PAGE.format(
            site=SITE, id=s["id"], name=s["name"], name_roman=s["nameRoman"],
            tagline=s["tagline"], tagline_roman=s["taglineRoman"], occasion=s["occasion"],
        ))
        print(f"  s/{s['id']}/index.html")

    # point index.html's absolute OG/canonical URLs at SITE_URL
    idx = ROOT / "index.html"
    html = idx.read_text()
    html = re.sub(r'(<link rel="canonical" href=")[^"]*(")', r'\g<1>' + SITE + '/\g<2>', html)
    html = re.sub(r'(<meta property="og:url" content=")[^"]*(")', r'\g<1>' + SITE + '/\g<2>', html)
    html = re.sub(r'(content=")https?://[^"]*?(/assets/og-image\.png")',
                  r'\g<1>' + SITE + r'\g<2>', html)
    idx.write_text(html)
    print("Rewrote absolute URLs in index.html")

    httpd.shutdown()
    print(f"\nSITE_URL = {SITE}   (override: SITE_URL=https://your.domain python3 scripts/build.py)")


if __name__ == "__main__":
    if not os.path.exists(CHROME):
        sys.exit("Google Chrome not found — needed to render the OG cards.")
    main()
