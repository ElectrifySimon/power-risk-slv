import React from "react";
import { createRoot } from "react-dom/client";
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

const HEADS = [];
document.querySelectorAll(".s-step h3, .s-cta h2").forEach((el) => {
  if (el.dataset.band) return;
  el.dataset.band = "1";
  HEADS.push(el);
});

function drawBand(el) {
  let svg = el.querySelector("svg.ul-band");
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "ul-band");
    svg.setAttribute("aria-hidden", "true");
    el.prepend(svg);
  }
  const box = el.getBoundingClientRect();
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.innerHTML = "";
  const range = document.createRange();
  range.selectNodeContents(el);
  [...range.getClientRects()].forEach((r, i) => {
    if (r.width < 4) return;
    const x = r.left - box.left - 4;
    const y = r.top - box.top + 2;
    const w = r.width + 8;
    const h = r.height - 2;
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", w);
    rect.setAttribute("height", h);
    rect.setAttribute("rx", 5);
    rect.setAttribute("fill", "rgba(255,186,110,0.28)");
    rect.style.transformOrigin = `${x}px center`;
    rect.style.transform = "scaleX(0)";
    rect.style.transition = `transform 720ms cubic-bezier(.22,.9,.24,1) ${i * 80}ms`;
    svg.appendChild(rect);
    requestAnimationFrame(() => requestAnimationFrame(() => { rect.style.transform = "scaleX(1)"; }));
  });
}

function drawAllBands() { HEADS.forEach(drawBand); }
drawAllBands();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(drawAllBands, 80));
window.addEventListener("resize", () => setTimeout(drawAllBands, 120));

// Targeted underlines: explicit phrase list, longest first, one per block.
const PHRASES = [
  "Climate Risk Assessment Tool",
  "every number behind this story",
  "almost all of them do",
  "critical flood risk",
  "backbone of the grid",
  "dry days increases",
  "over the century",
  "rises sharply",
  "heatwave risk",
  "drought risk",
  "flood risk",
];

function wrapPhrase(block, phrase) {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement.closest(".ul-target") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [];
  let full = "";
  while (walker.nextNode()) { nodes.push([walker.currentNode, full.length]); full += walker.currentNode.data; }
  const i = full.toLowerCase().indexOf(phrase.toLowerCase());
  if (i < 0) return null;
  const s0 = i, e0 = i + phrase.length;
  const hit = nodes.filter(([n, off]) => off <= s0 && off + n.data.length >= e0).pop();
  if (!hit) return null;
  const [tn, off] = hit;
  tn.splitText(e0 - off);
  const mid = tn.splitText(s0 - off);
  const span = document.createElement("span");
  span.className = "ul-target";
  mid.parentNode.replaceChild(span, mid);
  span.appendChild(mid);
  return span;
}

function drawUnderline(block, span) {
  const box = block.getBoundingClientRect();
  let svg = block.querySelector("svg.ul-line");
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "ul-line");
    svg.setAttribute("aria-hidden", "true");
    block.appendChild(svg);
  }
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.innerHTML = "";
  [...span.getClientRects()].forEach((r, i) => {
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
const usedBlocks = new Set();
PHRASES.forEach((phrase) => {
  const block = [...document.querySelectorAll(".s-step p, .s-cta p, .s-hero .s-stand")]
    .find((b) => !usedBlocks.has(b) && b.textContent.toLowerCase().includes(phrase.toLowerCase()));
  if (!block) return;
  const span = wrapPhrase(block, phrase);
  if (!span) return;
  usedBlocks.add(block);
  UL.push({ block, span });
});

function drawVisible() {
  const h = window.innerHeight;
  UL.forEach((t) => {
    if (t.done) return;
    const r = t.block.getBoundingClientRect();
    if (r.top < h * 0.85 && r.bottom > 40) { t.done = true; drawUnderline(t.block, t.span); }
  });
}

drawVisible();
if (window.ResizeObserver) {
  const ro = new ResizeObserver(() => UL.forEach((t) => { if (t.done) drawUnderline(t.block, t.span); }));
  UL.forEach((t) => ro.observe(t.block));
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(() => UL.forEach((t) => { if (t.done) drawUnderline(t.block, t.span); }), 100));
window.addEventListener("scroll", () => requestAnimationFrame(drawVisible), { passive: true });
window.addEventListener("resize", () => UL.forEach((t) => { if (t.done) drawUnderline(t.block, t.span); }));
