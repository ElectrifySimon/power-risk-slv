"""Verify the published page: unlock, then check story and dashboard at two widths."""
import json
import pathlib
from playwright.sync_api import sync_playwright

URL = "https://electrifysimon.github.io/power-risk-slv/"
PASS = pathlib.Path("/home/simon/projects/power-risk-slv/.passphrase").read_text().strip()

CHECKS = """() => {
  const g = s => { const e = document.querySelector(s); if (!e) return null;
    const r = e.getBoundingClientRect();
    return {x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height)}; };
  return {
    title: document.querySelector('h1') ? document.querySelector('h1').innerText : null,
    docW: document.documentElement.scrollWidth, vw: innerWidth,
    art: g('#art-land'), stand: g('.s-stand'),
    dupIds: (() => { const s = {}; const d = []; document.querySelectorAll('[id]').forEach(e => { if (s[e.id]) d.push(e.id); s[e.id] = 1; }); return d; })(),
    rampStory: !!document.getElementById('mapramp-story'),
    rampDash: !!document.getElementById('mapramp-dash'),
  };
}"""

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome-stable",
                          args=["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader"])
    for w, h in [(1440, 900), (390, 844)]:
        pg = b.new_page(viewport={"width": w, "height": h})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)[:90]))
        pg.goto(URL, wait_until="load", timeout=60000)
        pg.wait_for_timeout(900)
        pg.fill("input[type=password]", PASS)
        pg.keyboard.press("Enter")
        pg.wait_for_timeout(3200)
        base = pg.evaluate(CHECKS)
        pg.evaluate("() => document.getElementById('open-dash').click()")
        pg.wait_for_timeout(1400)
        dash = pg.evaluate("""() => {
          const tabs = [...document.querySelectorAll('[id^=tab-]')].map(t => t.textContent.trim());
          return {tabs, kpis: [...document.querySelectorAll('#kpis .kpi')].map(k => k.innerText.split('\\n').filter(Boolean).slice(0,2).join(' ')),
                  docW: document.documentElement.scrollWidth, canvas: [...document.querySelectorAll('canvas')].filter(c => c.width > 40).length};
        }""")
        print(json.dumps({"w": w, "base": base, "dash": dash, "errs": errs[:3]}))
        pg.screenshot(path=f"/tmp/live-prs-{w}.png")
        pg.close()
    b.close()
