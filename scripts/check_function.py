"""Functional check of the dashboard: hazards, periods, tabs, register, download."""
import json
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:8812/index.html"

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome-stable",
                          args=["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader"])
    for w, h in [(1440, 900), (390, 844)]:
        pg = b.new_page(viewport={"width": w, "height": h})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)[:110]))
        pg.goto(URL, wait_until="load", timeout=45000)
        pg.wait_for_timeout(1200)
        pg.evaluate("() => document.getElementById('open-dash').click()")
        pg.wait_for_timeout(1500)

        out = {"w": w, "hazards": {}, "kpis": None}
        out["kpis"] = pg.evaluate("() => [...document.querySelectorAll('#kpis .kpi')].map(k => k.innerText.replace(/\\n/g, ' | ').slice(0, 60))")
        out["periods"] = pg.evaluate("() => [...document.querySelectorAll('[data-period], .seg button')].map(e => e.textContent.trim()).slice(0, 6)")

        for haz in ["Floods", "Droughts", "Heatwaves"]:
            clicked = pg.evaluate("""(name) => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === name);
              if (b) { b.click(); return true; } return false; }""", haz)
            pg.wait_for_timeout(1100)
            out["hazards"][haz] = {
                "clicked": clicked,
                "ramp": pg.evaluate("() => { const e = document.getElementById('mapramp-dash'); return e ? e.style.background.slice(0, 80) : null; }"),
                "mapFills": pg.evaluate("() => document.querySelectorAll('#mapview path').length"),
                "kpi": pg.evaluate("() => { const k = document.querySelector('#kpis .kpi'); return k ? k.innerText.replace(/\\n/g, ' | ').slice(0, 50) : null; }"),
                "charts": pg.evaluate("() => [...document.querySelectorAll('canvas')].filter(c => c.width > 40).length"),
            }
        out["errs"] = errs[:4]
        print(json.dumps(out))
        pg.close()
    b.close()
