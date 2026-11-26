#!/usr/bin/env python3
"""Build the single-file El Salvador power risk dashboard.

Inlines: data JSON, department geometry, icon sprite, base64 fonts, CSS, JS.
No runtime fetch, no CDN. Output: build/index.html
"""
import base64
import datetime
import json
import math
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
W, H, PAD_X, PAD_Y = 1000, 560, 88, 46
LAT0 = 13.8

GRAD = {
    "flood": {"x1": 0, "y1": 0, "x2": 1, "y2": 0.2,
              "stops": ["#EAF2F8", "#8FB9D6", "#2C7CAA"], "at": [0, 0.45, 1]},
    "drought": {"x1": 0, "y1": 0.1, "x2": 0.75, "y2": 1,
                "stops": ["#F7F2E8", "#D9BC8C", "#8A6A3A"], "at": [0, 0.5, 1]},
    "heat": {"x1": 0, "y1": 0, "x2": 0, "y2": 1,
             "stops": ["#FCEFE9", "#DE9A81", "#B03218"], "at": [0, 0.5, 1]},
}


def load_geo():
    gj = json.load(open(os.path.join(ROOT, "geo", "slv_adm1.geojson"), encoding="utf-8"))
    feats = gj["features"]
    k = math.cos(math.radians(LAT0))

    def rings(geom):
        if geom["type"] == "Polygon":
            return [geom["coordinates"][0]]
        out = []
        for poly in geom["coordinates"]:
            out.append(poly[0])
        return out

    pts_all = []
    for f in feats:
        for ring in rings(f["geometry"]):
            pts_all.extend(ring)
    xs = [p[0] * k for p in pts_all]
    ys = [p[1] for p in pts_all]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    s = min((W - 2 * PAD_X) / (maxx - minx), (H - 2 * PAD_Y) / (maxy - miny))
    ox = PAD_X + ((W - 2 * PAD_X) - (maxx - minx) * s) / 2
    oy = PAD_Y + ((H - 2 * PAD_Y) - (maxy - miny) * s) / 2

    def proj(lon, lat):
        return (ox + (lon * k - minx) * s, oy + (maxy - lat) * s)

    depts = []
    for f in feats:
        name = f["properties"]["shapeName"].replace("Departamento de ", "")
        parts = []
        for ring in rings(f["geometry"]):
            d = []
            for i, p in enumerate(ring):
                x, y = proj(p[0], p[1])
                d.append(("M" if i == 0 else "L") + f"{x:.1f} {y:.1f}")
            parts.append("".join(d) + "Z")
        depts.append({"n": name, "d": "".join(parts)})
    depts.sort(key=lambda d: d["n"])

    labels = [
        {"c": "neighbour", "x": round(proj(-90.16, 14.10)[0]), "y": round(proj(-90.16, 14.10)[1]), "t": "Guatemala", "anchor": "end"},
        {"c": "neighbour", "x": round(proj(-87.66, 13.92)[0]), "y": round(proj(-87.66, 13.92)[1]), "t": "Honduras", "anchor": "start"},
        {"c": "sea", "x": round(proj(-89.45, 13.06)[0]), "y": round(proj(-89.45, 13.06)[1]), "t": "Pacific Ocean", "anchor": "middle"},
    ]
    regions = [
        {"t": "WEST", "x": round(proj(-89.78, 13.92)[0]), "y": round(proj(-89.78, 13.92)[1])},
        {"t": "CENTRE", "x": round(proj(-89.05, 13.90)[0]), "y": round(proj(-89.05, 13.90)[1])},
        {"t": "EAST", "x": round(proj(-88.25, 13.72)[0]), "y": round(proj(-88.25, 13.72)[1])},
    ]
    cx, cy = proj(-89.1914, 13.6929)
    return {"vb": f"0 0 {W} {H}", "depts": depts, "grad": GRAD, "labels": labels,
            "regions": regions, "capital": {"x": round(cx, 1), "y": round(cy, 1)}}


def icon_sprite():
    base = os.path.join(ROOT, "vendor", "icons")
    out = []
    re_path = os.path.join(ROOT, "vendor", "irena", "re-icons.svg")
    if os.path.exists(re_path):
        re_raw = open(re_path, encoding="utf-8").read()
        re_syms = re.findall(r"<symbol.*?</symbol>", re_raw, flags=re.S)
        re_syms = [x.replace('stroke-width="3"', 'stroke-width="5.4"') for x in re_syms]
        out.extend(re_syms)
    for f in sorted(os.listdir(base)):
        if not f.endswith(".svg"):
            continue
        name = f[:-4]
        raw = open(os.path.join(base, f), encoding="utf-8").read()
        vb = re.search(r'viewBox="([^"]+)"', raw)
        body = re.sub(r"^.*?<svg[^>]*>", "", raw, flags=re.S)
        body = re.sub(r"</svg>\s*$", "", body, flags=re.S)
        body = re.sub(r'\s+xmlns="http://www\.w3\.org/2000/svg"', "", body)
        out.append(f'<symbol id="i-{name}" viewBox="{vb.group(1)}" fill="none" stroke="currentColor" '
                   f'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{body}</symbol>')
    return "".join(out)


def fonts_css(css):
    for fam in ("montserrat", "inter"):
        path = os.path.join(ROOT, "vendor", "fonts", fam + ".woff2")
        b64 = base64.b64encode(open(path, "rb").read()).decode()
        css = css.replace(f"url(vendor/fonts/{fam}.woff2)",
                          f"url(data:font/woff2;base64,{b64})")
    return css


def _v(path):
    import hashlib
    return hashlib.md5(open(path, "rb").read()).hexdigest()[:8]



def fmt_num(v):
    s = f"{v:,}".replace(",", "&nbsp;")
    return s


def tokens(obj, text):
    """Replace {{key}} with a figure from the consolidated data file."""
    import re as _re

    def sub(m):
        key = m.group(1)
        if key not in obj:
            raise KeyError(f"story token {{{{{key}}}}} has no value in data/power-risk-slv.json")
        return fmt_num(obj[key])

    return _re.sub(r"\{\{([a-z0-9_]+)\}\}", sub, text)


def main():
    data = json.load(open(os.path.join(ROOT, "data", "power-risk-slv.json"), encoding="utf-8"))
    data["build"] = datetime.datetime.now(datetime.timezone.utc).strftime("%-d %B %Y")

    css = fonts_css(open(os.path.join(ROOT, "src", "page.css"), encoding="utf-8").read())
    css += open(os.path.join(ROOT, "src", "story.css"), encoding="utf-8").read()
    story_html = open(os.path.join(ROOT, "src", "story.html"), encoding="utf-8").read()
    story_html = tokens(data["derived"], story_html)
    body = open(os.path.join(ROOT, "src", "page.html"), encoding="utf-8").read()
    js = open(os.path.join(ROOT, "src", "app.js"), encoding="utf-8").read()
    js2 = open(os.path.join(ROOT, "src", "story.js"), encoding="utf-8").read()
    sprite = icon_sprite()

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Power under pressure &middot; El Salvador power sector climate risk</title>
<meta name="description" content="Climate risk to El Salvador's power sector: generation, substations and transmission under floods, droughts and heatwaves.">
<style>{css}</style>
</head>
<body>
<section id="story" class="story">
{story_html}
</section>
<div id="app" class="app">
{body}
</div>
<script src="vendor/echarts.min.js?v=__ECH_V__"></script>
<script src="vendor/hero-react.js?v=__HERO_V__"></script>
<script>
var DATA = {json.dumps(data, ensure_ascii=False, separators=(",", ":"))};
document.getElementById("sprite").innerHTML = {json.dumps(sprite)};
</script>
<script>{js}</script>
<script>{js2}</script>
</body>
</html>
"""
    os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "build", "vendor"), exist_ok=True)
    import shutil as _sh
    hero_v = _v(os.path.join(ROOT, "vendor", "hero-react.js"))
    ech_v = _v(os.path.join(ROOT, "vendor", "echarts.min.js"))
    _sh.copy(os.path.join(ROOT, "vendor", "echarts.min.js"),
             os.path.join(ROOT, "build", "vendor", "echarts.min.js"))
    html = html.replace("__HERO_V__", hero_v).replace("__ECH_V__", ech_v)
    _sh.copy(os.path.join(ROOT, "vendor", "hero-react.js"),
             os.path.join(ROOT, "build", "vendor", "hero-react.js"))
    out = os.path.join(ROOT, "build", "index.html")
    open(out, "w", encoding="utf-8").write(html)
    print(f"built {out} {len(html):,} chars, {len(data['GEO']['depts'])} departments, "
          f"{len(data['N'])} hazards, {len(data['ASSETS'])} asset types")


if __name__ == "__main__":
    main()
