import React from "react";

export default function ShimmerLoader({ height = 24, width = "100%", style = {} }) {
  return (
    <div
      style={{
        height,
        width,
        background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%)",
        backgroundSize: "400% 100%",
        animation: "shimmer 1.4s ease infinite",
        borderRadius: 4,
        ...style,
      }}
      className="shimmer-loader"
    />
  );
}

// Add shimmer animation to global styles if not present
if (typeof window !== "undefined") {
  const styleId = "shimmer-loader-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      @keyframes shimmer {
        0% { background-position: -400px 0; }
        100% { background-position: 400px 0; }
      }
      .shimmer-loader {
        display: inline-block;
      }
    `;
    document.head.appendChild(style);
  }
}
