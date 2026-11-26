#!/usr/bin/env python3
"""Consolidate every data input of power-risk-slv into one JSON file.

Output: data/power-risk-slv.json

The product is then a single data dependency: counts, hazard statistics,
measures, department geometry and every figure the narrative quotes live in
one object. Rewriting this file is the only data step; build.py inlines it.
"""
import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "power-risk-slv.json")
GEO = os.path.join(ROOT, "geo", "slv_adm1.geojson")
OUT = SRC

CAT_ORDER = ["Low", "Moderate", "High", "Critical"]


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


def load_geo(gj):
    feats = gj["features"]
    k = math.cos(math.radians(LAT0))

    def rings(geom):
        if geom["type"] == "Polygon":
            return [geom["coordinates"][0]]
        return [poly[0] for poly in geom["coordinates"]]

    pts = []
    for f in feats:
        for ring in rings(f["geometry"]):
            pts.extend(ring)
    xs = [p[0] * k for p in pts]
    ys = [p[1] for p in pts]
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


def pct(part, whole):
    return int(round(100.0 * part / whole))


def main():
    src = json.load(open(SRC, encoding="utf-8"))
    raw_geo = json.load(open(GEO, encoding="utf-8"))
    geo = load_geo(raw_geo)

    N, MW = src["N"], src["MW"]
    assets = src["ASSETS"]
    gen = [a["id"] for a in assets if a["g"] == "gen"]
    subs = [a["id"] for a in assets if a["id"] in ("tsub", "dsub")]

    def counts(per):
        return {k: sum(v) for k, v in N["flood"][per].items()}

    near, mid = counts("s"), counts("m")
    total = sum(near.values())
    n_gen = sum(near[i] for i in gen)
    n_subs = sum(near[i] for i in subs)
    n_tower = near["tower"]

    def hc(haz, per, ids):
        return sum(N[haz][per][i][2] + N[haz][per][i][3] for i in ids)

    def critical(haz, per, ids):
        return sum(N[haz][per][i][3] for i in ids)

    def cap_share(haz, per):
        num = sum(MW[haz][per][i][2] + MW[haz][per][i][3] for i in MW[haz][per])
        den = sum(sum(v) for v in MW[haz][per].values())
        return pct(num, den) if den else 0

    derived = {
        "n_assets": total,
        "n_generation": n_gen,
        "n_substations": n_subs,
        "n_towers": n_tower,
        "n_departments": len(geo["depts"]),
        "n_hazards": len(src["HAZ"]),
        "n_periods": len(src["PER"]),

        "gen_flood_near_pct": pct(hc("flood", "s", gen), n_gen),
        "gen_flood_mid_pct": pct(hc("flood", "m", gen), n_gen),
        "gen_flood_near_capacity_pct": cap_share("flood", "s"),
        "gen_flood_mid_capacity_pct": cap_share("flood", "m"),

        "sub_flood_near_n": hc("flood", "s", subs),
        "sub_flood_near_pct": pct(hc("flood", "s", subs), n_subs),
        "sub_flood_near_critical": critical("flood", "s", subs),
        "sub_flood_mid_n": hc("flood", "m", subs),
        "sub_flood_mid_pct": pct(hc("flood", "m", subs), n_subs),
        "sub_flood_mid_critical": critical("flood", "m", subs),
        "tsub_flood_mid_pct": pct(hc("flood", "m", ["tsub"]), mid["tsub"]),

        "sub_heat_near_n": hc("heat", "s", subs),
        "sub_heat_mid_n": hc("heat", "m", subs),

        "tower_flood_near_n": hc("flood", "s", ["tower"]),
        "tower_flood_near_pct": pct(hc("flood", "s", ["tower"]), n_tower),
        "tower_flood_mid_n": hc("flood", "m", ["tower"]),
        "tower_flood_mid_pct": pct(hc("flood", "m", ["tower"]), n_tower),

        "solar_n": near["solar"],
        "solar_heat_near_moderate_pct": pct(N["heat"]["s"]["solar"][1], near["solar"]),
    }

    out = {
        "meta": src["meta"],
        "PER": src["PER"],
        "CATS": src["CATS"],
        "HAZ": src["HAZ"],
        "ASSETS": src["ASSETS"],
        "DEF": src["DEF"],
        "N": N,
        "MW": MW,
        "MEAS": src["MEAS"],
        "GEO": geo,
        "derived": derived,
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    print(json.dumps(derived, indent=1))
    print("wrote", OUT, os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    main()
