(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var story = $("#story"), app = $("#app");
  if (!story || !app) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var GEO = DATA.GEO, N = DATA.N;
  var CCOL = { low: "#9FB3C6", mod: "#93AFC8", high: "#0073AB", crit: "#B03218" };

  /* ---------- hero art ---------- */
  function landSvg(target, stroke, width, opacity) {
    var paths = GEO.depts.map(function (d) { return '<path d="' + d.d + '"/>'; }).join("");
    target.innerHTML = '<svg viewBox="' + GEO.vb + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      '<g fill="rgba(142,197,255,.045)" stroke="' + stroke + '" stroke-width="' + width +
      '" stroke-linejoin="round" opacity="' + opacity + '">' + paths + "</g></svg>";
  }
  function contours(target) {
    var vb = GEO.vb.split(" ").map(Number), w = vb[2], h = vb[3], out = "";
    for (var i = 0; i < 18; i++) {
      var r = 60 + i * 32, amp = 9 + (i % 3) * 5, pts = [];
      for (var a = 0; a <= 360; a += 8) {
        var rad = (a * Math.PI) / 180;
        var rr = r + Math.sin(rad * 3 + i * 0.6) * amp + Math.cos(rad * 4 - i) * amp * 0.45;
        pts.push([660 + Math.cos(rad) * rr * 1.3, 310 + Math.sin(rad) * rr * 0.7]);
      }
      out += '<path d="M' + pts.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join("L") + 'Z"/>';
    }
    target.innerHTML = '<svg viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<g fill="none" stroke="rgba(142,197,255,.13)" stroke-width="1">' + out + "</g></svg>";
  }
  landSvg($("#art-land"), "rgba(142,197,255,.92)", 2, 1);
  contours($("#art-contours"));

  /* ---------- stage map ---------- */
  var HAZ = ["flood", "drought", "heat"];
  var GRAD = {
    flood: ["#EAF2F8", "#8FB9D6", "#2C7CAA"],
    drought: ["#F7F2E8", "#D9BC8C", "#8A6A3A"],
    heat: ["#FCEFE9", "#DE9A81", "#B03218"]
  };
  function buildStageMap() {
    var defs = HAZ.map(function (h) {
      var x2 = h === "heat" ? 0 : 1, y2 = h === "heat" ? 1 : 0.2;
      return '<linearGradient id="sg-' + h + '" x1="0" y1="0" x2="' + x2 + '" y2="' + y2 + '">' +
        GRAD[h].map(function (c, i) { return '<stop offset="' + [0, 0.5, 1][i] + '" stop-color="' + c + '"/>'; }).join("") +
        "</linearGradient>";
    }).join("");
    var clip = '<clipPath id="scountry">' + GEO.depts.map(function (d) { return '<path d="' + d.d + '"/>'; }).join("") + "</clipPath>";
    var washes = HAZ.map(function (h) {
      return '<rect class="swash" data-h="' + h + '" x="0" y="0" width="1000" height="560" fill="url(#sg-' + h + ')" opacity="0"/>';
    }).join("");
    var depts = GEO.depts.map(function (d) {
      return '<path class="dept" d="' + d.d + '"><title>' + d.n + "</title></path>";
    }).join("");
    var labels = GEO.labels.map(function (l) {
      return '<text class="' + l.c + '" x="' + l.x + '" y="' + l.y + '"' + (l.anchor ? ' text-anchor="' + l.anchor + '"' : "") + ">" + l.t + "</text>";
    }).join("");
    var regions = GEO.regions.map(function (r) {
      return '<text class="region" x="' + r.x + '" y="' + r.y + '" text-anchor="middle">' + r.t + "</text>";
    }).join("");
    $("#stage-map").innerHTML = '<svg viewBox="' + GEO.vb + '" role="img" aria-label="Map of El Salvador by department">' +
      "<defs>" + defs + clip + "</defs>" +
      '<g clip-path="url(#scountry)">' + washes + "</g>" +
      "<g fill=\"none\">" + depts + "</g>" + labels + regions +
      '<circle class="dot" cx="' + GEO.capital.x + '" cy="' + GEO.capital.y + '" r="4"/>' +
      '<text class="capt" x="' + (GEO.capital.x + 8) + '" y="' + (GEO.capital.y + 3.5) + '">San Salvador</text>' +
      "</svg>";
  }
  buildStageMap();

  function paintMap(haz) {
    Array.prototype.forEach.call(document.querySelectorAll(".swash"), function (r) {
      r.setAttribute("opacity", r.getAttribute("data-h") === haz ? "0.9" : "0");
    });
    var ramp = $("#mapramp");
    if (ramp) ramp.style.background = "linear-gradient(" + (haz === "heat" ? "180deg" : "90deg") + "," + GRAD[haz].join(",") + ")";
  }

  /* ---------- waffle, plants, solar ---------- */
  function totals(haz, per, ids) {
    var arr = [0, 0, 0, 0];
    ids.forEach(function (id) {
      (N[haz][per][id] || []).forEach(function (v, i) { arr[i] += v; });
    });
    return arr;
  }
  var SUBS = ["tsub", "dsub"];
  var WF = {
    s: { arr: totals("flood", "s", SUBS), title: "159 substations", note: "Near term, 2015\u20132044: 89 of 159 at high or critical flood risk, 16 of them critical." },
    m: { arr: totals("flood", "m", SUBS), title: "159 substations", note: "2041\u20132070: 128 of 159 at high or critical flood risk, 47 of them critical." },
    heat: { arr: totals("heat", "m", SUBS), title: "159 substations", note: "2041\u20132070: all 159 at high or critical heatwave risk, against 14 in the near term." }
  };
  /* ---------- ECharts ---------- */
  var CLASSCOL = ["#5C7285", "#8FB4CE", "#0073AB", "#B03218"];
  var CHARTS = {};
  var ANIM = !reduce && !!window.echarts;

  function chart(id) {
    if (!window.echarts) return null;
    if (!CHARTS[id]) {
      var el = document.getElementById(id);
      if (!el) return null;
      CHARTS[id] = echarts.init(el, null, { renderer: "canvas" });
    }
    return CHARTS[id];
  }

  var lastWf = "s";
  function buildWaffle(key) {
    lastWf = key;
    var d = WF[key] || WF.s;
    $("#wf-title").textContent = d.title;
    $("#wf-note").textContent = d.note;
    var c = chart("waffle"); if (!c) return;
    var cols = 16, rows = 10, total = d.arr.reduce(function (a, b) { return a + b; }, 0);
    var data = [];
    for (var j = 0; j < total; j++) {
      var acc = 0, ci = 0;
      for (var k = 0; k < 4; k++) { acc += d.arr[k]; if (j < acc) { ci = k; break; } }
      data.push({ value: [j % cols, Math.floor(j / cols)], itemStyle: { color: CLASSCOL[ci] } });
    }
    var el = document.getElementById("waffle");
    var w = (el && el.clientWidth) || 420;
    var cell = Math.max(8, Math.floor((w - (cols - 1) * 5) / cols));
    c.setOption({
      animation: ANIM, animationDuration: 650, animationDurationUpdate: 900,
      animationEasing: "cubicOut", animationEasingUpdate: "cubicInOut",
      animationDelay: function (idx) { return idx * 4; },
      animationDelayUpdate: function (idx) { return idx * 3; },
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      xAxis: { type: "value", min: -0.5, max: cols - 0.5, show: false },
      yAxis: { type: "value", min: -0.5, max: rows - 0.5, inverse: true, show: false },
      series: [{ type: "scatter", symbol: "rect", symbolSize: cell - 4, silent: true, data: data }]
    });
  }

  function buildPlants() {
    var arr = totals("drought", "m", ["hydro"]);
    var hot = arr[2] + arr[3], total = arr.reduce(function (a, b) { return a + b; }, 0);
    var c = chart("plants"); if (!c) return;
    var cols = 7, data = [];
    for (var i = 0; i < total; i++) {
      data.push({
        value: [i % cols, Math.floor(i / cols)],
        itemStyle: { color: i < hot ? CLASSCOL[3] : "rgba(233,241,248,.16)" }
      });
    }
    var el = document.getElementById("plants");
    var w = (el && el.clientWidth) || 300;
    var cell = Math.max(10, Math.floor((w - (cols - 1) * 8) / cols));
    c.setOption({
      animation: ANIM, animationDuration: 600, animationDelay: function (idx) { return idx * 22; },
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      xAxis: { type: "value", min: -0.5, max: cols - 0.5, show: false },
      yAxis: { type: "value", min: -0.5, max: 2.5, inverse: true, show: false },
      series: [{ type: "scatter", symbol: "rect", symbolSize: cell - 4, silent: true, data: data }]
    }, true);
  }

  function fmtN2(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u2009"); }

  function buildSolar() {
    var near = totals("heat", "s", ["solar"]), mid = totals("heat", "m", ["solar"]);
    var t = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
    var tn = t(near), tm = t(mid);
    var riskN = near[1], riskM = mid[1];
    var lead = document.getElementById("solar-lead");
    if (lead) lead.innerHTML = fmtN2(riskN) + " installations at moderate heat risk today. By 2041&ndash;2070 it is " +
      fmtN2(riskM) + ", 99.7% of the fleet.";

    var c = chart("solarbars"); if (!c) return;
    var names = ["Low", "Moderate", "High", "Critical"];
    var pct = function (a) { var s2 = t(a) || 1; return a.map(function (v) { return Math.round((v / s2) * 1000) / 10; }); };
    var A = pct(mid), B = pct(near);
    var cnt = function (a) { return [a[0], a[1], a[2], a[3]]; };
    var AN = cnt(mid), BN = cnt(near);
    c.setOption({
      animation: ANIM, animationDuration: 800, animationDurationUpdate: 900,
      animationEasing: "cubicOut", animationEasingUpdate: "cubicInOut",
      grid: { left: 4, right: 10, top: 8, bottom: 26, containLabel: true },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(7,22,39,.94)",
        borderColor: "rgba(142,197,255,.3)", textStyle: { color: "#E9F1F8", fontSize: 12 },
        formatter: function (ps) {
          var i = ps[0].dataIndex, arr = i === 0 ? AN : BN, tot2 = i === 0 ? tm : tn;
          return (i === 0 ? "2041\u20132070" : "2015\u20132044") + "<br/>" + ps.map(function (p2, k) {
            var v2 = arr[k] || 0;
            return p2.marker + p2.seriesName + ": " + fmtN2(v2) + " (" + Math.round((v2 / tot2) * 100) + "%)";
          }).join("<br/>");
        } },
      xAxis: { type: "value", max: 100, axisLabel: { color: "rgba(233,241,248,.6)", fontSize: 10, formatter: "{value}%" },
        splitLine: { lineStyle: { color: "rgba(255,255,255,.07)" } }, axisLine: { show: false } },
      yAxis: { type: "category", data: ["2041\u20132070", "2015\u20132044"],
        axisLabel: { color: "rgba(233,241,248,.8)", fontSize: 11.5 }, axisTick: { show: false }, axisLine: { show: false } },
      series: names.map(function (n, i) {
        return {
          name: n, type: "bar", stack: "risk", barWidth: 30, data: [A[i], B[i]],
          itemStyle: { color: CLASSCOL[i], borderRadius: i === 3 ? [0, 4, 4, 0] : 0 },
          label: { show: true, position: "inside", color: "#fff", fontSize: 11, fontWeight: 700,
            formatter: function (p2) {
              return p2.value >= 8 ? (p2.value >= 99.5 ? p2.value.toFixed(1) : Math.round(p2.value)) + "%" : "";
            } }
        };
      })
    });
  }

  function buildTowers() {
    var near = totals("flood", "s", ["tower"]), mid = totals("flood", "m", ["tower"]);
    var tot = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
    var hn = near[2] + near[3], hm = mid[2] + mid[3], tn = tot(near), tm = tot(mid);
    var c = chart("towers"); if (!c) return;
    var lbl = function (n, t) { return Math.round((n / t) * 100) + "%  \u00b7  " + n + " of " + t; };
    c.setOption({
      animation: ANIM, animationDuration: 750, animationDurationUpdate: 900,
      animationEasing: "cubicOut", animationEasingUpdate: "cubicInOut",
      grid: { left: 4, right: 118, top: 10, bottom: 26, containLabel: true },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "rgba(7,22,39,.94)",
        borderColor: "rgba(142,197,255,.3)", textStyle: { color: "#E9F1F8", fontSize: 12 } },
      xAxis: { type: "value", max: 100, axisLabel: { color: "rgba(233,241,248,.6)", fontSize: 10, formatter: "{value}%" },
        splitLine: { lineStyle: { color: "rgba(255,255,255,.07)" } }, axisLine: { show: false } },
      yAxis: { type: "category", data: ["2041\u20132070", "2015\u20132044"],
        axisLabel: { color: "rgba(233,241,248,.8)", fontSize: 11.5 }, axisTick: { show: false }, axisLine: { show: false } },
      series: [
        { name: "track", type: "bar", barWidth: 26, silent: true, data: [100, 100], barGap: "-100%",
          itemStyle: { color: "rgba(255,255,255,.07)", borderRadius: 4 }, z: 1, animation: false },
        { name: "High or critical", type: "bar", barWidth: 26, data: [
            { value: Math.round((hm / tm) * 100), label: { formatter: lbl(hm, tm) } },
            { value: Math.round((hn / tn) * 100), label: { formatter: lbl(hn, tn) } }
          ],
          itemStyle: { color: "#0073AB", borderRadius: 4 },
          label: { show: true, position: "right", color: "#E9F1F8", fontSize: 11.5, fontWeight: 600 }, z: 2 }
      ]
    });
  }

  if ("ResizeObserver" in window) {
    var ro = new ResizeObserver(function () { Object.keys(CHARTS).forEach(function (k) { CHARTS[k].resize(); }); });
    ["waffle", "plants", "solarbars", "towers"].forEach(function (id) {
      var el = document.getElementById(id); if (el) ro.observe(el);
    });
  }

  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      Object.keys(CHARTS).forEach(function (k) { CHARTS[k].resize(); });
      buildWaffle(lastWf);
      buildTowers();
    }, 160);
  });

  /* ---------- parallax ---------- */
  var art = [
    { el: $("#art-contours"), rate: 0.16 },
    { el: $("#art-land"), rate: 0.3 }
  ];
  var ticking = false;
  function frame() {
    var y = window.scrollY || 0;
    if (!reduce) {
      art.forEach(function (a) {
        if (a.el) a.el.style.transform = "translate3d(0," + (-y * a.rate).toFixed(1) + "px,0)";
      });
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }, { passive: true });
  frame();

  /* ---------- step observer ---------- */
  var steps = Array.prototype.slice.call(document.querySelectorAll(".s-step"));
  var vises = Array.prototype.slice.call(document.querySelectorAll(".vis"));
  function activate(step) {
    steps.forEach(function (s) { s.classList.toggle("on", s === step); });
    var v = step.dataset.vis;
    vises.forEach(function (n) { n.classList.toggle("on", n.dataset.vis === v); });
    if (v === "map") {
      paintMap(step.dataset.haz || "flood");
      var mt = $("#map-title");
      if (mt) mt.textContent = "Indicative pattern of change \u00b7 " + (step.dataset.haz || "flood") + "s";
    }
    var wfKey = step.dataset.waffle || "s";
    var draw = function () {
      if (!document.querySelector('.vis.on[data-vis="' + v + '"]')) return;
      if (v === "waffle") buildWaffle(wfKey);
      if (v === "hydro") buildPlants();
      if (v === "solar") buildSolar();
      if (v === "towers") buildTowers();
      setTimeout(function () {
        Object.keys(CHARTS).forEach(function (k) { CHARTS[k].resize(); });
      }, 120);
    };
    requestAnimationFrame(function () { requestAnimationFrame(draw); });
    setTimeout(draw, 120);
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) activate(e.target);
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    steps.forEach(function (s) { io.observe(s); });
  }
  activate(steps[0]);

  /* ---------- hero contour field (skill recipe: dashboard-chrome) ---------- */
  function heroField() {
    var cv = document.getElementById("bgfx"); if (!cv) return;
    var ctx = cv.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var W = 0, H = 0, t = 0, last = 0, raf = null, on = true;
    var N = 26, rgb = [142, 197, 255];
    function size() {
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw() {
      if (!W || !H) return;
      ctx.clearRect(0, 0, W, H);
      var step = Math.max(2, W / 190), r = rgb[0], g = rgb[1], b = rgb[2];
      for (var i = 0; i < N; i++) {
        var base = (i + 0.5) / N * H, amp = 24 + 44 * Math.abs(Math.sin(i * 0.63 + 1.1));
        var a = 0.05 + 0.09 * (0.5 + 0.5 * Math.sin(i * 0.87 + 0.4));
        ctx.beginPath();
        for (var x = 0; x <= W; x += step) {
          var u = x / W;
          var y = base
            + Math.sin(u * 4.2 + t * 0.32 + i * 0.31) * amp * 0.52
            + Math.sin(u * 9.4 - t * 0.21 + i * 0.17) * amp * 0.29
            + Math.sin(u * 1.7 + t * 0.13 + i * 0.06) * amp * 0.19;
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = "rgba(" + r + "," + g + "," + b + "," + a.toFixed(3) + ")";
        ctx.lineWidth = 1; ctx.stroke();
      }
    }
    function loop(ts) {
      if (!on) return;
      if (ts - last > 40) { t = ts / 1000; draw(); last = ts; }
      raf = requestAnimationFrame(loop);
    }
    size(); draw();
    if (!reduced) raf = requestAnimationFrame(loop);
    window.addEventListener("resize", function () { size(); draw(); });
    var hero = document.querySelector(".s-hero");
    if ("IntersectionObserver" in window && hero) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          on = e.isIntersecting && !document.hidden && !reduced;
          if (on) { last = 0; raf = requestAnimationFrame(loop); } else { cancelAnimationFrame(raf); }
        });
      }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { on = false; cancelAnimationFrame(raf); }
      else if (!reduced) { on = true; last = 0; raf = requestAnimationFrame(loop); }
    });
  }
  heroField();

  /* ---------- routing ---------- */
  function route() {
    var dash = location.hash.replace("#", "") === "dashboard";
    app.classList.toggle("on", dash);
    story.style.display = dash ? "none" : "";
    document.body.style.background = dash ? "" : "#071627";
    if (dash) {
      window.scrollTo(0, 0);
      if (window.__animateKPIs) window.__animateKPIs();
    }
  }
  ["#open-dash", "#jump-dash"].forEach(function (sel) {
    var b = $(sel);
    if (b) b.addEventListener("click", function () { location.hash = "dashboard"; });
  });
  var back = $("#to-story");
  if (back) back.addEventListener("click", function () { location.hash = ""; });
  window.addEventListener("hashchange", route);
  route();
})();
