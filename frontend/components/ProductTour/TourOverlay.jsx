"use client";

export function TourOverlay({ rect, padding = 8, hidden }) {
  if (hidden) return null;
  if (!rect || typeof window === "undefined") {
    return <div className="leadsy-tour-overlay" aria-hidden="true" />;
  }

  const top = Math.max(0, rect.top - padding);
  const left = Math.max(0, rect.left - padding);
  const width = rect.width + padding * 2;
  const height = rect.height + padding * 2;
  const right = Math.max(0, window.innerWidth - left - width);
  const bottom = Math.max(0, window.innerHeight - top - height);

  return (
    <div className="leadsy-tour-overlay" aria-hidden="true">
      <div className="leadsy-tour-overlay-piece" style={{ top: 0, left: 0, right: 0, height: top }} />
      <div className="leadsy-tour-overlay-piece" style={{ top, left: 0, width: left, height }} />
      <div className="leadsy-tour-overlay-piece" style={{ top, right: 0, width: right, height }} />
      <div className="leadsy-tour-overlay-piece" style={{ left: 0, right: 0, bottom: 0, height: bottom }} />
    </div>
  );
}
