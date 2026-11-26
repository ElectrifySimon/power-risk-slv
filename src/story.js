(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var story = $("#story"), app = $("#app");
  if (!story || !app) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var GEO = DATA.GEO, N = DATA.N, ASSETS = DATA.ASSETS;
  var COL = ["#E1E9F1", "#A9C0D5", "#0073AB", "#B03218"];

  /* ---- layers ---- */
  function landSvg(id, opacity, stroke, width) {
    var vb = GEO.vb.split(" ").map(Number);
    var paths = GEO.depts.map(function (d) {
      return '<path d="' + d.d + '"/>';
    }).join("");
    $("#" + id).innerHTML =
      '<svg viewBox="' + GEO.vb + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      '<g fill="none" stroke="' + stroke + '" stroke-width="' + (width || 1) + '" stroke-linejoin="round" opacity="' + opacity + '">' +
      paths + "</g></svg>";
  }

  function contours(id) {
    var vb = GEO.vb.split(" ").map(Number), w = vb[2], h = vb[3];
    var out = "";
    for (var i = 0; i < 16; i++) {
      var r = 70 + i * 34, amp = 8 + (i % 4) * 4;
      var pts = [];
      for (var a = 0; a <= 360; a += 8) {
        var rad = (a * Math.PI) / 180;
        var rr = r + Math.sin(rad * 3 + i * 0.7) * amp + Math.cos(rad * 5 - i) * amp * 0.4;
        pts.push([640 + Math.cos(rad) * rr * 1.25, 300 + Math.sin(rad) * rr * 0.72]);
      }
      out += "<path d=\"M" + pts.map(function (p) { return p[0].toFixed(1) + " " + p[1].toFixed(1); }).join("L") + "Z\"/>";
    }
    $("#" + id).innerHTML =
      '<svg viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<g fill="none" stroke="rgba(142,197,255,.12)" stroke-width="1">' + out + "</g></svg>";
  }

  landSvg("layer-land", "1", "rgba(142,197,255,.82)", 1.9);
  landSvg("stage-ghost", ".3", "rgba(142,197,255,.5)", 1);
  contours("layer-contours");

  /* ---- parallax ---- */
  var layers = [
    { el: $(".s-layer.glow"), rate: 0.05 },
    { el: $(".s-layer.contours"), rate: 0.12 },
    { el: $(".s-layer.land"), rate: 0.26 }
  ];
  var ticking = false;
  function frame() {
    var y = window.scrollY || 0;
    layers.forEach(function (l) {
      if (!l.el) return;
      l.el.style.transform = "translate3d(0," + (-y * l.rate).toFixed(1) + "px,0)";
    });
    ticking = false;
  }
  if (!reduce) {
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }, { passive: true });
    frame();
  }

  /* ---- scrolly steps ---- */
  var NUM = [
    { v: "56%", cap: "Substations at high or critical flood risk", sub: "2015\u20132044", haz: "flood", per: "s", ids: ["tsub", "dsub"] },
    { v: "81%", cap: "Substations at high or critical flood risk", sub: "2041\u20132070", haz: "flood", per: "m", ids: ["tsub", "dsub"] },
    { v: "100%", cap: "Substations at high or critical heatwave risk", sub: "2041\u20132070", haz: "heat", per: "m", ids: ["tsub", "dsub"] },
    { v: "1\u00A0813", cap: "Generation assets at high or critical flood risk", sub: "2041\u20132070", haz: "flood", per: "m", ids: null }
  ];

  function spark(def) {
    var arr = [0, 0, 0, 0];
    var ids = def.ids || ASSETS.filter(function (a) { return a.g === "gen"; }).map(function (a) { return a.id; });
    ids.forEach(function (id) {
      var a = N[def.haz][def.per][id] || [];
      a.forEach(function (v, i) { arr[i] += v; });
    });
    var t = arr.reduce(function (x, y) { return x + y; }, 0) || 1;
    $("#sn-spark").innerHTML = arr.map(function (v, i) {
      return v ? '<i style="width:' + (v / t) * 100 + "%;background:" + COL[i] + '"></i>' : "";
    }).join("");
  }

  function setStep(i) {
    var d = NUM[i]; if (!d) return;
    $("#sn-num").textContent = d.v;
    $("#sn-cap").textContent = d.cap;
    $("#sn-sub").textContent = d.sub;
    spark(d);
  }
  setStep(0);

  var steps = Array.prototype.slice.call(document.querySelectorAll(".step"));
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var i = +e.target.dataset.i;
        steps.forEach(function (s) { s.classList.toggle("on", s === e.target); });
        setStep(i);
      });
    }, { rootMargin: "-42% 0px -42% 0px", threshold: 0 });
    steps.forEach(function (s) { io.observe(s); });
  }

  /* ---- routing ---- */
  function route() {
    var dash = location.hash.replace("#", "") === "dashboard";
    app.classList.toggle("on", dash);
    story.style.display = dash ? "none" : "";
    document.body.style.background = dash ? "" : "#08182A";
    if (dash) window.scrollTo(0, 0);
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
