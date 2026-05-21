"use client";

export function TourMinimized({ currentStep, totalSteps, onRestore }) {
  return (
    <button className="leadsy-tour-minimized" onClick={onRestore} type="button">
      Tour: Step {currentStep + 1}/{totalSteps} ▲
    </button>
  );
}
