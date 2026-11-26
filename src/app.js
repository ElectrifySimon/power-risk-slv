(function () {
  "use strict";

  var N = DATA.N, MWt = DATA.MW, ASSETS = DATA.ASSETS, HAZ = DATA.HAZ,
      PER = DATA.PER, CATS = DATA.CATS, MEAS = DATA.MEAS, DEF = DATA.DEF, GEO = DATA.GEO;

  var CLS = ["low", "mod", "high", "crit"];
  var COL = { low: "#E4EBF2", mod: "#93AFC8", high: "#0073AB", crit: "#B03218" };
  var HAZCOL = { flood: "#0073AB", drought: "#8A6A3A", heat: "#B03218" };
  var ICON = { hydro: "i-re-hydropower", solar: "i-re-solar", geo: "i-re-geothermal", wind: "i-re-wind",
    biomass: "i-re-bioenergy", biogas: "i-re-bioenergy", ocean: "i-re-ocean",
    fossil: "i-fossil", substation: "i-substation", tower: "i-tower", line: "i-grid", grid: "i-grid",
    tsub: "i-substation", dsub: "i-substation", bsh: "i-re-bioenergy" };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
  var hc = function (a) { return a[2] + a[3]; };
  var pct = function (v, t) { return t ? (v / t) * 100 : 0; };
  var fp = function (p) { return p === 0 ? "0%" : (p < 1 ? "<1%" : Math.round(p) + "%"); };
  var nbsp = function (s) { return s.replace(/,/g, "\u00A0"); };
  var fmtN = function (v) { return nbsp(Math.round(v).toLocaleString("en-US")); };
  var fmtMW = function (v) {
    if (v >= 10) return nbsp(Math.round(v).toLocaleString("en-US"));
    if (v >= 1) return v.toFixed(1);
    return v.toFixed(2);
  };
  var ASSET = {}; ASSETS.forEach(function (a) { ASSET[a.id] = a; });

  /* ---------- map ---------- */
  var mapBuilt = false;
  function buildMap() {
    var vb = GEO.vb.split(" ").map(Number);
    var w = vb[2], h = vb[3];
    var depts = GEO.depts.map(function (d) {
      return '<path class="dept" data-n="' + d.n.replace(/"/g, "&quot;") + '" d="' + d.d + '"><title>' + d.n + "</title></path>";
    }).join("");

    var grads = ["flood", "drought", "heat"].map(function (k) {
      var g = GEO.grad[k];
      var stops = g.stops.map(function (c, i) {
        return '<stop offset="' + g.at[i] + '" stop-color="' + c + '"/>';
      }).join("");
      return '<linearGradient id="g-' + k + '" x1="' + g.x1 + '" y1="' + g.y1 + '" x2="' + g.x2 + '" y2="' + g.y2 + '">' + stops + "</linearGradient>";
    }).join("");

    var labels = GEO.labels.map(function (l) {
      return '<text class="' + l.c + '" x="' + l.x + '" y="' + l.y + '"' + (l.anchor ? ' text-anchor="' + l.anchor + '"' : "") + ">" + l.t + "</text>";
    }).join("");

    var regions = GEO.regions.map(function (r) {
      return '<text class="region" x="' + r.x + '" y="' + r.y + '" text-anchor="middle">' + r.t + "</text>";
    }).join("");

    var svg = '<svg viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Map of El Salvador by department, showing the indicative pattern of climate hazard change">' +
      "<defs>" + grads + '<clipPath id="country">' + GEO.depts.map(function (d) { return '<path d="' + d.d + '"/>'; }).join("") + "</clipPath></defs>" +
      '<g clip-path="url(#country)"><rect class="wash" x="0" y="0" width="' + w + '" height="' + h + '" fill="url(#g-flood)" opacity="0.55"/></g>' +
      '<g fill="none" stroke="#ADBECD" stroke-width="0.9" stroke-linejoin="round">' + depts + "</g>" +
      labels + regions +
      '<circle class="dot" cx="' + GEO.capital.x + '" cy="' + GEO.capital.y + '" r="4"/>' +
      '<text class="capt" x="' + (GEO.capital.x + 8) + '" y="' + (GEO.capital.y + 3.5) + '">San Salvador</text>' +
      "</svg>";
    $("#mapview").insertAdjacentHTML("afterbegin", svg);
    mapBuilt = true;

    var view = $("#mapview");
    view.addEventListener("mouseover", function (e) {
      var t = e.target.closest(".dept"); if (!t) return;
      var lab = $("#maplabel"); lab.textContent = t.getAttribute("data-n");
      var r = t.getBoundingClientRect(), vr = view.getBoundingClientRect();
      lab.style.left = (r.left - vr.left + r.width / 2 - lab.offsetWidth / 2) + "px";
      lab.style.top = (r.top - vr.top + r.height / 2 - lab.offsetHeight / 2) + "px";
      lab.classList.add("on");
    });
    view.addEventListener("mouseout", function (e) {
      if (e.target.closest(".dept")) $("#maplabel").classList.remove("on");
    });
  }

  function paintMap() {
    var wash = $(".wash", $("#mapview"));
    wash.setAttribute("fill", "url(#g-" + S.haz + ")");
    wash.setAttribute("opacity", S.per === "s" ? "0.42" : "0.8");
    var ramp = $("#mapramp"), g = GEO.grad[S.haz];
    if (ramp) ramp.style.background = "linear-gradient(" +
      (S.haz === "heat" ? "180deg" : "90deg") + "," + g.stops.join(",") + ")";
  }

  /* ---------- KPIs ---------- */
  function share(h, p, ids, tab) {
    var t = 0, v = 0;
    ids.forEach(function (id) {
      var a = tab[h][p][id]; if (!a) return;
      t += sum(a); v += hc(a);
    });
    return pct(v, t);
  }

  var KPI_TARGETS = [];
  window.__animateKPIs = function () {
    KPI_TARGETS.forEach(function (pair) {
      var el = pair[0].querySelector(".v"), bar = pair[0].querySelector(".kbar i"), to = pair[1];
      el.textContent = "0%";
      if (bar) { bar.style.transition = "none"; bar.style.width = "0"; }
      requestAnimationFrame(function () {
        if (bar) { bar.style.transition = ""; bar.style.width = Math.max(2, Math.min(100, to)) + "%"; }
        countUp(el, to, 0);
      });
    });
  };

  function countUp(el, to, from) {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { el.textContent = Math.round(to) + "%"; return; }
    var start = performance.now(), dur = 950, f0 = from || 0;
    function tick(now) {
      var p = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(f0 + (to - f0) * e) + "%";
      if (p < 1) requestAnimationFrame(tick); else el.textContent = Math.round(to) + "%";
    }
    requestAnimationFrame(tick);
  }

  function renderKPIs() {
    var h = S.haz, gen = ASSETS.filter(function (a) { return a.g === "gen"; }).map(function (a) { return a.id; });
    var defs = [
      ["Generation assets", gen, N, "capacity"],
      ["Generation capacity", gen, MWt, "grid"],
      ["Substations", ["tsub", "dsub"], N, "substation"],
      ["Transmission towers", ["tower"], N, "tower"]
    ];
    var box = $("#kpis"); box.innerHTML = ""; KPI_TARGETS.length = 0;
    defs.forEach(function (d) {
      var a = share(h, "s", d[1], d[2]), b = share(h, "m", d[1], d[2]);
      var v, c;
      if (S.per === "s") { v = fp(a); c = "high or critical, " + PER.s; }
      else {
        v = fp(b);
        var diff = Math.round(b) - Math.round(a);
        c = '<span class="delta">' + (diff === 0 ? "no change" : (diff > 0 ? "+" + diff : diff) + " pts") + "</span> vs " + fp(a) + " in " + PER.s;
      }
      var el = document.createElement("div");
      el.className = "kpi";
      var target = parseFloat(v) || 0;
      el.innerHTML = '<p class="l"><svg class="ic" aria-hidden="true"><use href="#i-' + d[3] + '"/></svg>' + d[0] + "</p>" +
        '<p class="v">0%</p><span class="kbar"><i style="width:0"></i></span>' +
        '<p class="c">' + c + "</p>";
      box.appendChild(el);
      countUp(el.querySelector(".v"), target, (el._shown || 0));
      el._shown = target;
      var bar = el.querySelector(".kbar i");
      setTimeout(function () { bar.style.width = Math.max(2, Math.min(100, target)) + "%"; }, 40);
      KPI_TARGETS.push([el, target]);
    });
    var total = 0;
    ASSETS.forEach(function (a) { total += sum(N.flood.s[a.id] || [0, 0, 0, 0]); });
    var note = document.createElement("p");
    note.className = "kpinote";
    note.innerHTML = "Share at high or critical risk &middot; " + HAZ[h].name.toLowerCase() + " &middot; " +
      (S.per === "s" ? PER.s : PER.m) + " &middot; " + fmtN(total) + " assets across " + ASSETS.length + " types";
    box.appendChild(note);
  }

  /* ---------- chart ---------- */
  function renderChart() {
    var h = S.haz, tab = S.met === "n" ? N : MWt;
    var pers = S.per === "c" ? ["s", "m"] : [S.per];
    $("#chart-note").innerHTML = (S.met === "n"
      ? "Share of assets in each risk category, by asset type. "
      : "Share of installed and planned capacity in each risk category, generation only. ") +
      "Sorted by share at high or critical risk. Hover a segment for the exact count.";

    var lg = $("#legend"); lg.innerHTML = "";
    CATS.forEach(function (c, i) {
      var s = document.createElement("span");
      s.innerHTML = '<i style="background:' + COL[CLS[i]] + '"></i>' + c;
      lg.appendChild(s);
    });
    var tot = document.createElement("span");
    tot.innerHTML = "<em>Bars are shares of each asset type</em>";
    lg.appendChild(tot);

    var ch = $("#chart"); ch.innerHTML = "";
    ["gen", "grid"].forEach(function (g) {
      if (g === "grid" && S.met === "mw") return;
      var rowset = ASSETS.filter(function (a) { return a.g === g; }).filter(function (a) {
        return pers.some(function (p) { return sum(tab[h][p][a.id] || []); });
      });
      rowset.sort(function (x, y) {
        var ax = tab[h][pers[0]][x.id] || [], ay = tab[h][pers[0]][y.id] || [];
        var d = pct(hc(ay), sum(ay)) - pct(hc(ax), sum(ax));
        if (Math.abs(d) > 0.01) return d;
        return sum(ay) - sum(ax);
      });

      var gd = document.createElement("div");
      gd.className = "grp";
      gd.textContent = g === "gen" ? "Generation" : "Transmission and distribution";
      ch.appendChild(gd);

      rowset.forEach(function (a) {
        var t0 = sum(tab[h][pers[0]][a.id] || []), unit = S.met === "n" ? (t0 === 1 ? "asset" : "assets") : "MW";
        var row = document.createElement("div"); row.className = "row";
        var icon = ICON[a.id] ? '<svg class="ic" aria-hidden="true"><use href="#' + ICON[a.id] + '"></use></svg>' : "";
        var hid = tab[h][pers[pers.length - 1]][a.id] || [0, 0, 0, 0];
        var hshare = fp(pct(hc(hid), sum(hid)));
        row.innerHTML = '<div class="rl">' + icon + '<span class="nm">' + a.name +
          "<small>" + (S.met === "n" ? fmtN(t0) : fmtMW(t0)) + " " + unit + (a.note ? " &middot; " + a.note : "") +
          (t0 <= 2 ? " &middot; indicative" : "") + "</small></span></div>";
        var bars = document.createElement("div"); bars.className = "bars";
        pers.forEach(function (p) {
          var arr = tab[h][p][a.id] || [0, 0, 0, 0], t = sum(arr);
          var line = document.createElement("div"); line.className = "bl";
          line.innerHTML = '<div class="pl">' + (pers.length > 1 ? PER[p] : "") + "</div>";
          var bar = document.createElement("div"); bar.className = "bar";
          arr.forEach(function (v, i) {
            if (!v) return;
            var w = pct(v, t);
            var seg = document.createElement("div");
            seg.className = "seg-b " + CLS[i];
            seg.style.width = w + "%";
            seg.style.background = COL[CLS[i]];
            if (w >= 12) seg.textContent = fp(w);
            seg.setAttribute("title",
              a.name + " \u00B7 " + PER[p] + " \u00B7 " + CATS[i] + " risk: " +
              (S.met === "n" ? fmtN(v) + " " + (v === 1 ? "asset" : "assets") : fmtMW(v) + " MW") + " (" + fp(w) + ")");
            bar.appendChild(seg);
          });
          line.appendChild(bar);
          bars.appendChild(line);
        });
        row.appendChild(bars);
        var hcbox = document.createElement("div");
        hcbox.className = "hc";
        hcbox.innerHTML = hshare + "<small>high + crit.</small>";
        row.appendChild(hcbox);
        ch.appendChild(row);
      });
    });
  }

  /* ---------- map side ---------- */
  function renderSide() {
    var h = S.haz, p = S.per === "s" ? "s" : "m";
    var subs = Math.round(pct(hc(N[h][p].tsub) + hc(N[h][p].dsub), 159));
    var tow = Math.round(pct(hc(N.flood[p].tower), 3026));
    var genIds = ASSETS.filter(function (a) { return a.g === "gen"; }).map(function (a) { return a.id; });
    var genShare = Math.round(share(h, p, genIds, N));
    var txt = {
      flood: "Extreme rainfall increases most in the <b>east and centre</b>. In " + PER[p] + ", <b>" + subs +
        "%</b> of substations and <b>" + tow + "%</b> of transmission towers face high or critical flood risk.",
      drought: "Longer dry spells affect the <b>south and east</b> most. In " + PER[p] + ", <b>" +
        hc(N.drought[p].hydro) + " of 19</b> hydropower plants face high or critical drought risk, mostly small plants. The large reservoirs depend on Lempa sub-basins shared with Guatemala and Honduras.",
      heat: "Very hot days increase <b>across the whole country</b>, most in the south. The share of substations at high or critical heatwave risk reaches <b>" +
        Math.round(pct(hc(N.heat[p].tsub) + hc(N.heat[p].dsub), 159)) + "%</b> in " + PER[p] + ", against <b>" +
        Math.round(pct(hc(N.heat.s.tsub) + hc(N.heat.s.dsub), 159)) + "%</b> in " + PER.s + "."
    };
    $("#finding").innerHTML = txt[h];
    $("#maptitle").textContent = "Where " + HAZ[h].name.toLowerCase() + " grow";

    var groups = [
      ["Generation assets", genIds],
      ["Substations", ["tsub", "dsub"]],
      ["Transmission towers", ["tower"]]
    ];
    var mini = $("#mini"); mini.innerHTML = "";
    groups.forEach(function (g) {
      var at = 0, hi = 0;
      g[1].forEach(function (id) { var a = N[h][p][id] || []; at += sum(a); hi += hc(a); });
      var d = document.createElement("div"); d.className = "m";
      d.innerHTML = '<span class="n">' + g[0] + '</span><span class="p">' + fmtN(hi) + " of " + fmtN(at) + "</span>" +
        '<div class="bar"><div style="width:' + pct(hi, at) + '%;background:' + HAZCOL[h] + '"></div></div>';
      mini.appendChild(d);
    });
    var cap = document.createElement("p");
    cap.className = "cap";
    cap.style.margin = "0";
    cap.textContent = "Share at high or critical risk, " + PER[p] + ".";
    mini.appendChild(cap);
  }

  
var CHIPICON = {
  "Hydropower": "i-re-hydropower", "Solar PV": "i-re-solar", "Bioenergy": "i-re-bioenergy",
  "Biomass": "i-re-bioenergy", "Biogas": "i-re-bioenergy", "Geothermal": "i-re-geothermal",
  "Wind": "i-re-wind", "Fossil thermal": "i-fossil", "Substations": "i-substation",
  "T&D lines": "i-grid", "Transmission lines": "i-grid", "Transmission towers": "i-tower"
};
function chipIcon(name) {
  var id = CHIPICON[name];
  return id ? '<svg class="ic" aria-hidden="true"><use href="#' + id + '"/></svg>' : "";
}

/* ---------- measures ---------- */
  var MS = { a: "All", h: "all" };
  function renderMeasures() {
    var assets = ["All"].concat(MEAS.map(function (m) { return m.a; }).filter(function (v, i, s) { return s.indexOf(v) === i; }));
    var ca = $("#m-asset"); ca.innerHTML = "";
    assets.forEach(function (a) {
      var b = document.createElement("button");
      b.className = "chip"; b.type = "button";
      b.setAttribute("aria-pressed", MS.a === a);
      b.innerHTML = chipIcon(a) + "<span>" + a + "</span>";
      b.onclick = function () { MS.a = a; renderMeasures(); };
      ca.appendChild(b);
    });
    var ch = $("#m-haz"); ch.innerHTML = "";
    [["all", "All hazards"], ["flood", "Floods"], ["drought", "Droughts"], ["heat", "Heatwaves"]].forEach(function (o) {
      var b = document.createElement("button");
      b.className = "chip"; b.type = "button";
      b.setAttribute("aria-pressed", MS.h === o[0]);
      b.innerHTML = (o[0] !== "all"
        ? '<svg class="ic" aria-hidden="true" style="color:' + HAZCOL[o[0]] + '"><use href="#i-' + o[0] + '"/></svg>'
        : "") + '<span>' + o[1] + '</span>';
      b.onclick = function () { MS.h = o[0]; renderMeasures(); };
      ch.appendChild(b);
    });

    var g = $("#mgrid"); g.innerHTML = "";
    MEAS.filter(function (m) {
      return (MS.a === "All" || m.a === MS.a) && (MS.h === "all" || m.h === MS.h);
    }).forEach(function (m) {
      var arr = [0, 0, 0, 0];
      m.ids.forEach(function (id) { (N[m.h].m[id] || []).forEach(function (v, i) { arr[i] += v; }); });
      var t = sum(arr);
      var bar = arr.map(function (v, i) {
        return v ? '<div class="seg-b ' + CLS[i] + '" style="width:' + pct(v, t) + "%;background:" + COL[CLS[i]] + '"></div>' : "";
      }).join("");
      var card = document.createElement("div"); card.className = "mcard";
      card.innerHTML = '<div class="mhead">' + chipIcon(m.a) + "<span>" + m.a + '</span><span class="haz"><svg class="ic" aria-hidden="true" style="color:' + HAZCOL[m.h] + '"><use href="#i-' + m.h + '"/></svg>' + HAZ[m.h].name + "</span></div>" +
        '<div class="mbody"><div class="minibar">' + bar + "</div>" +
        '<p class="cap">' + fp(pct(hc(arr), t)) + " of " + m.a.toLowerCase() + " at high or critical risk, " + PER.m + "</p>" +
        "<h4>Potential impacts</h4><p>" + m.imp + "</p>" +
        "<h4>Resilience measures</h4><ul>" + m.m.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul></div>";
      g.appendChild(card);
    });
  }

  /* ---------- calculator ---------- */
  var K2 = { asset: "Substation", haz: "flood", lvl: 1, s: 1, ac: 0.6 };
  function catOf(r) { return r <= 0.4 ? 0 : r <= 0.8 ? 1 : r <= 1.5 ? 2 : 3; }
  function initCalc() {
    var sa = $("#k-asset");
    Object.keys(DEF).forEach(function (a) {
      var o = document.createElement("option"); o.value = a; o.textContent = a; sa.appendChild(o);
    });
    sa.value = K2.asset;
    var sh = $("#k-haz");
    Object.keys(HAZ).forEach(function (h) {
      var o = document.createElement("option"); o.value = h; o.textContent = HAZ[h].name; sh.appendChild(o);
    });
    sh.value = K2.haz;
    var lv = $("#k-lvl");
    [[0.4, "Low"], [0.8, "Moderate"], [1, "High"]].forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("aria-pressed", K2.lvl === o[0]); b.textContent = o[1];
      b.onclick = function () {
        K2.lvl = o[0];
        Array.prototype.forEach.call(lv.children, function (x) { x.setAttribute("aria-pressed", x === b); });
        calc();
      };
      lv.appendChild(b);
    });
    var load = function () {
      var d = DEF[K2.asset][K2.haz]; K2.s = d[0]; K2.ac = d[1];
      $("#k-s").value = K2.s; $("#k-ac").value = K2.ac; calc();
    };
    sa.onchange = function () { K2.asset = sa.value; load(); };
    sh.onchange = function () { K2.haz = sh.value; load(); };
    $("#k-s").oninput = function (e) { K2.s = +e.target.value; calc(); };
    $("#k-ac").oninput = function (e) { K2.ac = +e.target.value; calc(); };
    $("#k-measure").onclick = function () {
      K2.ac = Math.min(1, Math.round((K2.ac + 0.2) * 10) / 10);
      $("#k-ac").value = K2.ac; calc();
    };
    $("#k-reset").onclick = load;
    var sc = $("#r-scale");
    [[0.4, 0], [0.4, 1], [0.7, 2], [1, 3]].forEach(function (o) {
      var d = document.createElement("div");
      d.style.width = (o[0] / 2.5) * 100 + "%";
      d.style.background = COL[CLS[o[1]]];
      sc.appendChild(d);
    });
    load();
  }
  function calc() {
    var v = K2.s / K2.ac, r = K2.lvl * K2.lvl * v, c = catOf(r);
    $("#o-s").textContent = K2.s.toFixed(1);
    $("#o-ac").textContent = K2.ac.toFixed(1);
    $("#r-score").textContent = r.toFixed(2);
    var ce = $("#r-cat");
    ce.textContent = CATS[c];
    ce.style.background = COL[CLS[c]];
    ce.style.color = c === 1 ? "#22323F" : "#fff";
    $("#r-mark").style.left = Math.min(100, (r / 2.5) * 100) + "%";
    var d = DEF[K2.asset][K2.haz];
    $("#r-expl").innerHTML = K2.lvl.toFixed(1) + " hazard &times; " + K2.lvl.toFixed(1) + " exposure &times; " +
      K2.s.toFixed(1) + " sensitivity &divide; " + K2.ac.toFixed(1) + " adaptive capacity = <b>" + r.toFixed(2) + "</b>." +
      '<br><span style="color:var(--muted)">Report default for ' + K2.asset.toLowerCase() + ", " + HAZ[K2.haz].name.toLowerCase() +
      ": sensitivity " + d[0].toFixed(1) + ", adaptive capacity " + d[1].toFixed(1) + ".</span>";
  }

  /* ---------- register ---------- */
  var ROWS = [];
  function buildRows() {
    ROWS = [];
    ["flood", "drought", "heat"].forEach(function (h) {
      ["s", "m"].forEach(function (p) {
        ASSETS.forEach(function (a) {
          var arr = N[h][p][a.id];
          if (!arr) return;
          for (var i = 0; i < 4; i++) {
            var mw = MWt[h][p][a.id] ? MWt[h][p][a.id][i] : null;
            if (!arr[i] && !mw) continue;
            ROWS.push({
              group: a.g === "gen" ? "Generation" : "Transmission and distribution", grpk: a.g,
              asset: a.name, haz: HAZ[h].name, hazk: h, per: PER[p], perk: p,
              cls: CATS[i], clsi: i, n: arr[i], mw: mw
            });
          }
        });
      });
    });
  }
  var RS = { key: "n", dir: -1 };
  function renderRegister() {
    var q = ($("#q").value || "").toLowerCase().trim();
    var fh = $("#f-haz").value, fp2 = $("#f-per").value;
    var fg = $("#f-grp").value, fc = $("#f-cls").value;
    var rows = ROWS.filter(function (r) {
      if (fh !== "all" && r.hazk !== fh) return false;
      if (fp2 !== "all" && r.perk !== fp2) return false;
      if (fg !== "all" && r.grpk !== fg) return false;
      if (fc !== "all" && String(r.clsi) !== fc) return false;
      if (!q) return true;
      return (r.group + " " + r.asset + " " + r.haz + " " + r.per + " " + r.cls).toLowerCase().indexOf(q) >= 0;
    });
    rows.sort(function (a, b) {
      var k = RS.key, x = a[k], y = b[k];
      if (k === "mw") { x = x == null ? -1 : x; y = y == null ? -1 : y; }
      if (x === y) return 0;
      return (x > y ? 1 : -1) * RS.dir;
    });
    var tb = $("#reg tbody"); tb.innerHTML = "";
    var frag = document.createDocumentFragment();
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td>" + r.group.replace("Transmission and distribution", "T&amp;D") + "</td><td>" + r.asset + "</td><td>" +
        '<span class="hazc"><svg class="ic" aria-hidden="true"><use href="#i-' + r.hazk + '"/></svg>' + r.haz + "</span>" +
        "</td><td>" + r.per + '</td><td><span class="cls"><i style="background:' + COL[CLS[r.clsi]] + '"></i>' + r.cls + "</span></td>" +
        '<td class="num">' + (r.n ? fmtN(r.n) : '<span class="none">0</span>') + "</td>" +
        '<td class="num">' + (r.mw == null ? '<span class="none">n/a</span>' : fmtMW(r.mw)) + "</td>";
      frag.appendChild(tr);
    });
    tb.appendChild(frag);
    $("#rcount").textContent = "Showing all " + rows.length + " rows";
    window.__EXPORT_ROWS = rows;
  }
  function csv() {
    /* One JSON is the product's data layer: the register rows the reader is
       looking at, plus the counts, measures and derived figures behind them. */
    var rows = (window.__EXPORT_ROWS || ROWS).map(function (r) {
      return { group: r.group, asset: r.asset, hazard: r.haz, period: r.per,
               risk_class: r.cls, assets: r.n, capacity_mw: r.mw };
    });
    var payload = {
      meta: DATA.meta,
      periods: DATA.PER,
      categories: DATA.CATS,
      hazards: DATA.HAZ,
      assets: DATA.ASSETS,
      definitions: DATA.DEF,
      counts: { N: DATA.N, MW: DATA.MW },
      measures: DATA.MEAS,
      derived: DATA.derived,
      register: rows
    };
    var blob = new Blob([JSON.stringify(payload, null, 1)], { type: "application/json;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "el_salvador_power_risk.json";
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---------- tabs ---------- */
  function show(view) {
    Array.prototype.forEach.call(document.querySelectorAll(".view"), function (v) {
      v.classList.toggle("on", v.id === "view-" + view);
    });
    Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (b) {
      b.setAttribute("aria-selected", b.dataset.view === view);
    });
    if (view === "register" && !$("#reg tbody").children.length) renderRegister();
    try { history.replaceState(null, "", "#dashboard"); } catch (e) { }
  }

  function segment(sel, opts, key, onchange) {
    var c = $(sel); c.innerHTML = "";
    opts.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-pressed", S[key] === o.v);
      b.innerHTML = (o.icon ? '<svg class="ic" aria-hidden="true"><use href="#i-' + o.icon + '"/></svg>' : (o.dot ? '<span class="dot" style="background:' + o.dot + '"></span>' : "")) + "<span>" + o.t + "</span>";
      b.onclick = function () {
        S[key] = o.v;
        Array.prototype.forEach.call(c.children, function (x) { x.setAttribute("aria-pressed", x === b); });
        onchange();
      };
      c.appendChild(b);
    });
  }

  /* ---------- boot ---------- */
  var S = { haz: "flood", per: "m", met: "n" };

  buildMap();
  buildRows();
  segment("#c-haz", Object.keys(HAZ).map(function (h) { return { v: h, t: HAZ[h].name, icon: h }; }), "haz", renderAll);
  segment("#c-per", [{ v: "c", t: "Compare" }, { v: "s", t: PER.s }, { v: "m", t: PER.m }], "per", renderAll);
  segment("#c-met", [{ v: "n", t: "Number of assets" }, { v: "mw", t: "Capacity (MW)" }], "met", renderAll);

  function renderAll() { renderKPIs(); renderChart(); renderSide(); paintMap(); }

  renderAll();
  renderMeasures();
  initCalc();

  Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (b) {
    b.onclick = function () { show(b.dataset.view); };
  });
  $("#dl-top").onclick = csv;
  $("#dl-reg").onclick = csv;
  $("#q").oninput = renderRegister;
  $("#f-haz").onchange = renderRegister;
  $("#f-per").onchange = renderRegister;
  $("#f-grp").onchange = renderRegister;
  $("#f-cls").onchange = renderRegister;
  var thN = document.querySelector('#reg thead th[data-k="n"]');
  if (thN) { thN.setAttribute("aria-sort", "descending"); thN.textContent = thN.textContent + " \u25BC"; }
  Array.prototype.forEach.call(document.querySelectorAll("#reg thead th"), function (th) {
    th.onclick = function () {
      var k = th.dataset.k;
      if (RS.key === k) RS.dir *= -1; else { RS.key = k; RS.dir = (k === "n" || k === "mw" || k === "cls") ? -1 : 1; }
      Array.prototype.forEach.call(document.querySelectorAll("#reg thead th"), function (x) {
        x.removeAttribute("aria-sort");
        x.textContent = x.textContent.replace(/\s*[\u25B2\u25BC]$/, "");
      });
      th.setAttribute("aria-sort", RS.dir === 1 ? "ascending" : "descending");
      th.textContent = th.textContent + (RS.dir === 1 ? " \u25B2" : " \u25BC");
      renderRegister();
    };
  });

  // footer facts, all derived
  var totalAssets = 0, types = ASSETS.length;
  ASSETS.forEach(function (a) { totalAssets += sum(N.flood.s[a.id] || [0, 0, 0, 0]); });
  $("#f-cov").innerHTML = fmtN(totalAssets) + " assets across " + types + " types, 3 hazards, 2 periods and 4 risk classes.";
  $("#f-date").textContent = DATA.build;

  var h0 = (location.hash || "").replace("#", "");
  if (["results", "measures", "method", "register"].indexOf(h0) >= 0) show(h0);
})();
