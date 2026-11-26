import React from "react";
import { createRoot } from "react-dom/client";
import { annotate } from "rough-notation";
import { Highlighter } from "./Highlighter.tsx";

const BLUE = "#8EC5FF";

// Inline phrases: the MagicUI Highlighter component itself.
document.querySelectorAll("[data-hl]").forEach((el) => {
  const text = el.textContent;
  const action = el.getAttribute("data-hl") || "highlight";
  const color = el.getAttribute("data-hl-color") || "rgba(0,115,171,0.5)";
  createRoot(el).render(
    <Highlighter action={action} color={color} strokeWidth={1.6} animationDuration={900} iterations={1} padding={3} multiline>
      {text}
    </Highlighter>
  );
});

// Whole blocks: same rough-notation engine the Highlighter wraps.
function annotateBlock(el, action, color) {
  if (!el || el.dataset.annotated) return;
  el.dataset.annotated = "1";
  const a = annotate(el, {
    type: action,
    color,
    strokeWidth: action === "underline" ? 1.25 : 1.5,
    animationDuration: 900,
    iterations: 1,
    padding: action === "underline" ? 2 : 6,
    multiline: true,
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { a.show(); io.disconnect(); }
    });
  }, { rootMargin: "-12% 0px -12% 0px" });
  io.observe(el);
}

document.querySelectorAll(".s-step h3, .s-cta h2").forEach((el) => annotateBlock(el, "highlight", "rgba(0,115,171,0.34)"));
document.querySelectorAll(".s-step p, .s-hero .s-stand, .s-cta p").forEach((el) => annotateBlock(el, "underline", "rgba(142,197,255,0.6)"));
