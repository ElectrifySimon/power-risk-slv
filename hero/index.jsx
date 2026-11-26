import React from "react";
import { createRoot } from "react-dom/client";
import GhostFibers from "./GhostFibers.jsx";

const mount = document.getElementById("bgfx-root");
if (mount) {
  createRoot(mount).render(
    <GhostFibers
      glowColor="#8EC5FF"
      secondaryColor="#0073AB"
      lineColor="#E4F2FF"
      gradient="along"
      threads={88}
      speed={0.42}
      layers={3}
      scale={1.12}
      waves={0.9}
      twist={1.1}
      volume={1.0}
      spread={1.3}
      density={1.0}
      thickness={1.3}
      flow={0.35}
      fiberStyle="lines"
      perspective={0.6}
      depthOfField={1.05}
      focusDepth={0}
      particles={0.45}
      sparkle={0.35}
      glow={1.12}
      brightness={1.3}
      vignette={0.28}
      grain={0.05}
      mouseInteraction
      hoverEffect="focus"
      intro
    />
  );
}
