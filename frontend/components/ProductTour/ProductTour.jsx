"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TourMinimized } from "./TourMinimized";
import { TourOverlay } from "./TourOverlay";
import { TourSpotlight } from "./TourSpotlight";
import { TourTooltip } from "./TourTooltip";
import { tourSteps } from "./tourSteps";
import { useTour } from "./useTour";
import "./ProductTour.css";

function getTargetRect(selector) {
  if (typeof document === "undefined") return null;
  const element = document.querySelector(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return rect;
}

export function ProductTour() {
  const router = useRouter();
  const pathname = usePathname();
  const tour = useTour();
  const [rect, setRect] = useState(null);
  // Track whether we've settled on the correct route for the current step
  // so we never fire router.push in the same render that triggered mount.
  const [routeReady, setRouteReady] = useState(false);
  const step = tourSteps[tour.currentStep];

  useEffect(() => {
    const start = () => tour.startTour();
    window.addEventListener("leadsy:start-tour", start);
    return () => window.removeEventListener("leadsy:start-tour", start);
  }, [tour.startTour]);

  // Delay routing check by one tick so lazy-initialised state is committed
  // before we evaluate whether a push is needed.
  useEffect(() => {
    const id = window.setTimeout(() => setRouteReady(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!routeReady || !tour.isActive || !step?.route || pathname === step.route) return;
    router.push(step.route);
  }, [pathname, router, routeReady, step?.route, tour.isActive]);

  useEffect(() => {
    if (!tour.isActive || tour.isMinimized || !step) return;

    let frame = 0;
    let attempts = 0;
    const update = () => {
      const nextRect = getTargetRect(step.target);
      setRect(nextRect);

      if (nextRect) {
        const element = document.querySelector(step.target);
        element?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
      } else if (attempts < 20) {
        attempts += 1;
        window.setTimeout(update, 120);
      }
    };

    frame = window.requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [pathname, step, tour.isActive, tour.isMinimized]);

  const fallbackRect = useMemo(() => {
    if (rect) return rect;
    if (typeof window === "undefined") return null;
    return {
      top: 72,
      left: Math.max(16, window.innerWidth / 2 - 160),
      right: Math.max(16, window.innerWidth / 2 + 160),
      bottom: 160,
      width: 320,
      height: 88,
    };
  }, [rect]);

  if (!tour.isActive || !step) return null;

  if (tour.isMinimized) {
    return (
      <TourMinimized
        currentStep={tour.currentStep}
        totalSteps={tour.totalSteps}
        onRestore={tour.restoreTour}
      />
    );
  }

  return (
    <>
      <TourOverlay rect={fallbackRect} padding={step.spotlightPadding ?? 8} hidden={step.disableOverlay} />
      <TourSpotlight rect={fallbackRect} padding={step.spotlightPadding ?? 8} hidden={step.disableOverlay} />
      <TourTooltip
        step={step}
        rect={fallbackRect}
        currentStep={tour.currentStep}
        totalSteps={tour.totalSteps}
        onNext={tour.nextStep}
        onPrev={tour.prevStep}
        onSkip={tour.skipTour}
        onMinimize={tour.minimizeTour}
      />
    </>
  );
}
