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
      cursorColor="#8EC5FF"
      typeEffect="none"
      startOnVisible={false}
    />
  );
}

// Inline phrases keep the MagicUI Highlighter component.
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

// Headings only: one marker band each, drawn once and kept.
document.querySelectorAll(".s-step h3, .s-cta h2").forEach((el) => {
  if (el.dataset.annotated) return;
  el.dataset.annotated = "1";
  const a = annotate(el, {
    type: "highlight",
    color: "rgba(0,115,171,0.30)",
    strokeWidth: 1,
    animationDuration: 900,
    iterations: 1,
    padding: 5,
    multiline: true,
  });
  a.show();
});
