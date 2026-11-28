"""Objective layout audit of the dashboard at a given viewport width."""
import json
import sys
from playwright.sync_api import sync_playwright

w = int(sys.argv[1]) if len(sys.argv) > 1 else 1440
h = int(sys.argv[2]) if len(sys.argv) > 2 else 900

AUDIT = """() => {
  const out = {clipped: [], overflow: [], empty: [], dupIds: [], tiny: [], lowContrast: []};
  const seen = {};
  document.querySelectorAll('[id]').forEach(e => {
    if (seen[e.id]) { if (out.dupIds.length < 6) out.dupIds.push(e.id); } else seen[e.id] = 1;
  });
  const vw = innerWidth;
  document.querySelectorAll('body *').forEach(e => {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    // text clipped inside a box with hidden overflow
    const hides = /hidden|clip/.test(cs.overflowX + cs.overflowY);
    if (hides && e.scrollWidth > e.clientWidth + 2 && e.textContent.trim().length > 12) {
      if (out.clipped.length < 10) out.clipped.push({
        sel: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').slice(0,2).join('.') : ''),
        sw: e.scrollWidth, cw: e.clientWidth, txt: e.textContent.trim().slice(0, 42)});
    }
    // element sticking out of the viewport
    if (r.right > vw + 2 || r.left < -2) {
      if (out.overflow.length < 8 && cs.position !== 'fixed') out.overflow.push({
        sel: e.tagName.toLowerCase() + (e.id ? '#' + e.id : ''), left: Math.round(r.left), right: Math.round(r.right)});
    }
    // nearly invisible text
    if (e.children.length === 0 && e.textContent.trim().length > 3) {
      const col = cs.color.match(/\\d+/g);
      const bg = cs.backgroundColor.match(/\\d+/g);
      const fs = parseFloat(cs.fontSize);
      if (col && fs && fs < 10.5 && out.tiny.length < 8) out.tiny.push({
        sel: e.tagName.toLowerCase() + (e.id ? '#' + e.id : ''), fs: fs, txt: e.textContent.trim().slice(0, 30)});
    }
  });
  document.querySelectorAll('canvas').forEach(c => {
    if (c.width < 20 || c.height < 20) out.empty.push(c.id || c.className);
  });
  out.docW = document.documentElement.scrollWidth; out.vw = vw;
  return out;
}"""

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome-stable",
                          args=["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": w, "height": h})
    pg.goto("http://127.0.0.1:8812/index.html", wait_until="load", timeout=45000)
    pg.wait_for_timeout(1500)
    print("STORY", json.dumps(pg.evaluate(AUDIT)))

    pg.evaluate("() => document.getElementById('open-dash').click()")
    pg.wait_for_timeout(1600)
    for tab in ["results", "measures", "method", "register"]:
        pg.evaluate("t => document.getElementById('tab-' + t).click()", tab)
        pg.wait_for_timeout(1000)
        print(tab.upper(), json.dumps(pg.evaluate(AUDIT)))
    b.close()
