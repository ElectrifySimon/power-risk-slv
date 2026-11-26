import React from "react";
import { createRoot } from "react-dom/client";
import { annotate } from "rough-notation";
import { Highlighter } from "./Highlighter.tsx";
import Silk from "./Silk.jsx";
import TextType from "./TextType.jsx";

const bg = document.getElementById("bgfx-root");
if (bg) {
  createRoot(bg).render(
    <Silk
      speed={4}
      scale={1.15}
      color="#0B2740"
      sheenColor="#8EC5FF"
      noiseIntensity={1.2}
      rotation={0.1}
      sheen={0.35}
      depth={0.45}
      glow={0.28}
      ripple={0.8}
      wave={0.9}
      variation={0.2}
      mouseInteraction
      interactionStrength={0.8}
      clickRipple
      intro
      fade={0.1}
      lightMode={false}
    />
  );
}

const title = document.getElementById("hero-title");
if (title) {
  title.textContent = "";
  createRoot(title).render(
    <TextType
      text="Power under pressure"
      as="span"
      typingSpeed={55}
      initialDelay={300}
      pauseDuration={0}
      loop={false}
      showCursor
      hideCursorWhileTyping={false}
      cursorCharacter="|"
      cursorColor="#FFD6AA"
      typeEffect="none"
      startOnVisible={false}
    />
  );
}

// Inline phrases keep the MagicUI Highlighter component.
document.querySelectorAll("[data-hl]").forEach((el) => {
  const text = el.textContent;
  const action = el.getAttribute("data-hl") || "highlight";
  const color = el.getAttribute("data-hl-color") || "rgba(255,186,110,0.34)";
  createRoot(el).render(
    <Highlighter action={action} color={color} strokeWidth={1.6} animationDuration={900} iterations={1} padding={3} multiline>
      {text}
    </Highlighter>
  );
});

// Headings only: one marker band each, drawn once and kept.
document.querySelectorAll(".s-step h3, .s-cta h2").forEach((el) => {
  if (el.dataset.annotated) return;
  el.dataset.annotated = "1";
  const a = annotate(el, {
    type: "highlight",
    color: "rgba(255,186,110,0.32)",
    strokeWidth: 1,
    animationDuration: 900,
    iterations: 1,
    padding: 5,
    multiline: true,
  });
  a.show();
});

// Targeted underlines: one key phrase per text block, hand-drawn SVG line, animated, then kept.
const CLAUSE = /[^.;:]+/g;
const KEY = /\b(\d[\d\u00A0\u202F ,.]*\s?(?:%|percent|GW|MW|GWh|km)?|one in five|four in five|more than half|half of|two in five|three in four|every substation|nine in ten)\b/i;

const STOP = /^(and|or|but|the|a|an|of|in|on|at|by|to|for|with|from|that|which|is|are|was|were|it|its|as|into|than|then)$/i;

function pickRange(text) {
  const tokens = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text))) tokens.push([m.index, m.index + m[0].length, m[0]]);
  if (!tokens.length) return null;

  const km = KEY.exec(text);
  let anchor = -1;
  if (km) anchor = tokens.findIndex(([a, b]) => a <= km.index && b >= km.index + Math.min(km[0].length, 1));
  if (anchor < 0) anchor = Math.min(tokens.length - 1, 2);

  let i = anchor, j = anchor;
  // widen up to 6 tokens around the anchor, never splitting a number token
  while (i > 0 && j - i < 5) i--;
  while (j < tokens.length - 1 && j - i < 5) j++;
  while (i < j && STOP.test(tokens[i][2])) i++;
  while (j > i && STOP.test(tokens[j][2])) j--;

  let start = tokens[i][0], end = tokens[j][1];
  while (end > start && /[\s,;:.]$/.test(text.slice(start, end))) end--;
  if (end - start < 4) return null;
  return [start, end];
}

function wrapTarget(block) {
  if (block.dataset.ul) return null;
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement.closest("[data-hl], .ul-target") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [];
  let full = "";
  while (walker.nextNode()) { nodes.push([walker.currentNode, full.length]); full += walker.currentNode.data; }
  const rng = pickRange(full);
  if (!rng) return null;
  const [s0, e0] = rng;
  const hit = nodes.filter(([n, off]) => off <= s0 && off + n.data.length >= e0).pop();
  if (!hit) return null;
  const [tn, off] = hit;
  const after = tn.splitText(e0 - off);
  const mid = tn.splitText(s0 - off);
  const span = document.createElement("span");
  span.className = "ul-target";
  mid.parentNode.replaceChild(span, mid);
  span.appendChild(mid);
  block.dataset.ul = "1";
  return { block, span };
}

function drawUnderline({ block, span }) {
  const box = block.getBoundingClientRect();
  let svg = block.querySelector("svg.ul-line");
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "ul-line");
    svg.setAttribute("aria-hidden", "true");
    block.appendChild(svg);
  }
  svg.setAttribute("viewBox", `0 0 ${Math.max(1, box.width)} ${Math.max(1, box.height)}`);
  svg.setAttribute("width", box.width);
  svg.setAttribute("height", box.height);
  svg.innerHTML = "";
  const rects = [...span.getClientRects()];
  rects.forEach((r, i) => {
    const x1 = r.left - box.left + 1;
    const x2 = r.right - box.left - 1;
    const y = r.bottom - box.top - 3;
    const drift = (i % 2 === 0 ? 1 : -1) * 1.2;
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", `M${x1},${y} C${x1 + (x2 - x1) * 0.33},${y + drift} ${x1 + (x2 - x1) * 0.66},${y - drift} ${x2},${y}`);
    p.setAttribute("fill", "none");
    p.setAttribute("stroke", "#FFD6AA");
    p.setAttribute("stroke-width", "1.7");
    p.setAttribute("stroke-linecap", "round");
    const len = x2 - x1;
    p.style.strokeDasharray = `${len}`;
    p.style.strokeDashoffset = `${len}`;
    p.style.transition = `stroke-dashoffset 760ms cubic-bezier(.22,.9,.24,1) ${i * 90}ms`;
    svg.appendChild(p);
    requestAnimationFrame(() => requestAnimationFrame(() => { p.style.strokeDashoffset = "0"; }));
  });
}

const UL = [];
document.querySelectorAll(".s-step p, .s-cta p, .s-hero .s-stand").forEach((block) => {
  if (block.textContent.trim().length < 60 || /Prototype for discussion/i.test(block.textContent)) return;
  const t = wrapTarget(block);
  if (t) UL.push(t);
});

function drawVisible() {
  const h = window.innerHeight;
  UL.forEach((t) => {
    if (t.done) return;
    const r = t.block.getBoundingClientRect();
    if (r.top < h * 0.85 && r.bottom > 40) { t.done = true; drawUnderline(t); }
  });
}

drawVisible();
window.addEventListener("scroll", () => requestAnimationFrame(drawVisible), { passive: true });
window.addEventListener("resize", () => UL.forEach((t) => { if (t.done) drawUnderline(t); }));
