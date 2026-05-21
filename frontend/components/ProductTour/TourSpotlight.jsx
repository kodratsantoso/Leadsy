"use client";

export function TourSpotlight({ rect, padding = 8, hidden }) {
  if (hidden || !rect) return null;

  return (
    <div
      className="leadsy-tour-spotlight"
      style={{
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      }}
      aria-hidden="true"
    />
  );
}
