"use client";

function getTooltipPosition(rect, placement) {
  const gap = 14;
  const width = 320;
  const height = 220;
  const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;
  const preferred = placement === "auto" ? "bottom" : placement;

  const clampLeft = (value) => Math.min(Math.max(16, value), viewportWidth - width - 16);
  const clampTop = (value) => Math.min(Math.max(16, value), viewportHeight - height - 16);

  if (!rect) {
    return { top: 80, left: Math.max(16, (viewportWidth - width) / 2) };
  }

  if (preferred === "top") {
    return { top: clampTop(rect.top - height - gap), left: clampLeft(rect.left + rect.width / 2 - width / 2) };
  }
  if (preferred === "left") {
    return { top: clampTop(rect.top + rect.height / 2 - height / 2), left: clampLeft(rect.left - width - gap) };
  }
  if (preferred === "right") {
    return { top: clampTop(rect.top + rect.height / 2 - height / 2), left: clampLeft(rect.right + gap) };
  }

  return { top: clampTop(rect.bottom + gap), left: clampLeft(rect.left + rect.width / 2 - width / 2) };
}

export function TourTooltip({
  step,
  rect,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onMinimize,
}) {
  const position = getTooltipPosition(rect, step.placement);
  const isLast = currentStep === totalSteps - 1;

  return (
    <section
      className="leadsy-tour-tooltip"
      style={{ top: position.top, left: position.left }}
      role="dialog"
      aria-live="polite"
      aria-label={step.title}
    >
      <div className="leadsy-tour-tooltip__header">
        <span className="leadsy-tour-progress">Step {currentStep + 1} of {totalSteps}</span>
        <button type="button" className="leadsy-tour-minimize" onClick={onMinimize}>
          Minimize
        </button>
      </div>
      <h2>{step.title}</h2>
      <p>{step.content}</p>
      <div className="leadsy-tour-actions">
        <button type="button" className="leadsy-tour-button leadsy-tour-button--ghost" onClick={onSkip}>
          Skip
        </button>
        <div className="leadsy-tour-actions__right">
          <button
            type="button"
            className="leadsy-tour-button leadsy-tour-button--secondary"
            onClick={onPrev}
            disabled={currentStep === 0}
          >
            Back
          </button>
          <button type="button" className="leadsy-tour-button leadsy-tour-button--primary" onClick={onNext}>
            {isLast ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </section>
  );
}
