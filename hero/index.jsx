import React from "react";
import { createRoot } from "react-dom/client";
import Topography from "./Topography.jsx";
import ShapeGrid from "./ShapeGrid.jsx";
import { Highlighter } from "./Highlighter.tsx";

const bg = document.getElementById("bgfx-root");
if (bg) {
  createRoot(bg).render(
    <Topography
      color="#7FB4DC"
      lineCount={26}
      lineWidth={1.15}
      majorLines
      elevation={1.15}
      foreground={0.3}
      scale={1.05}
      detail={0.42}
      tilt={36}
      speed={0.18}
      direction="forward"
      morph={0.26}
      glow={0.7}
      depthOfField={0.45}
      fog={0.42}
      brightness={1.35}
      opacity={1}
      mouseInteraction
      hoverEffect="lift"
      mouseRadius={1}
      mouseStrength={0.5}
      trail={0.3}
      parallax={0.45}
      markers="none"
      intro
      lightMode={false}
    />
  );
}

const dash = document.createElement("div");
dash.className = "dash-fx";
dash.setAttribute("aria-hidden", "true");
document.body.appendChild(dash);
createRoot(dash).render(
  <ShapeGrid
    shape="square"
    cellSize={64}
    lineWidth={1}
    direction="diagonal"
    speed={0.22}
    lineColor="rgba(0,115,171,0.22)"
    hoverColor="#0073AB"
    fillOpacity={0.05}
    radius={2}
    trail={0.55}
    glow={0.22}
    twinkle={0.1}
    fade={0.9}
    clickCascade={false}
    intro
    opacity={1}
    backgroundColor="transparent"
  />
);

window.addEventListener("load", () => {
  window.dispatchEvent(new Event("resize"));
  setTimeout(() => window.dispatchEvent(new Event("resize")), 400);
  setTimeout(() => window.dispatchEvent(new Event("resize")), 1400);
});

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
