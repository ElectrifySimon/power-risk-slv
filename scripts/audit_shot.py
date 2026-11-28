"""Capture the story steps and dashboard views at one viewport width."""
import json
import sys
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8812/index.html"
w = int(sys.argv[1]) if len(sys.argv) > 1 else 1440
h = int(sys.argv[2]) if len(sys.argv) > 2 else 900
tag = str(w)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome-stable",
                          args=["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)[:140]))
    pg.on("console", lambda m: errs.append("console " + m.text[:120]) if m.type == "error" else None)
    pg.goto(URL, wait_until="load", timeout=45000)
    pg.wait_for_timeout(2200)

    info = pg.evaluate("""() => ({
      steps: document.querySelectorAll('.step').length,
      docW: document.documentElement.scrollWidth,
      vw: innerWidth,
      h: document.body.scrollHeight,
      tabs: [...document.querySelectorAll('button[aria-controls]')].map(b => b.textContent.trim()),
    })""")
    print("INFO", json.dumps(info))

    pg.screenshot(path=f"/tmp/prs-hero-{tag}.png")

    n = info["steps"]
    for i in range(n):
        pg.evaluate("""(i) => { const s = document.querySelectorAll('.step')[i];
          const y = s.getBoundingClientRect().top + scrollY - innerHeight * 0.45;
          scrollTo({top: y, behavior: 'instant'}); }""", i)
        pg.wait_for_timeout(1400)
        pg.screenshot(path=f"/tmp/prs-step{i}-{tag}.png")

    # dashboard: it lives in #app and is revealed by the CTA button
    pg.evaluate("""() => { const b = document.getElementById('open-dash') || document.getElementById('jump-dash');
      if (b) b.click(); }""")
    pg.wait_for_timeout(1400)
    pg.evaluate("scrollTo({top: 0, behavior: 'instant'})")
    pg.wait_for_timeout(600)
    pg.screenshot(path=f"/tmp/prs-dash-{tag}.png")

    tabs = pg.query_selector_all("button[aria-controls]")
    for i, t in enumerate(tabs):
        label = (t.text_content() or "").strip().replace(" ", "_")[:18]
        try:
            t.click()
        except Exception as e:
            print("click fail", label, str(e)[:60])
        pg.wait_for_timeout(1100)
        pg.screenshot(path=f"/tmp/prs-tab{i}-{label}-{tag}.png")

    print("ERRS", errs[:6])
    b.close()
