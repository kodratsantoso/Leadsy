"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { tourSteps } from "./tourSteps";

const STORAGE_KEYS = {
  completed: "leadsy-product-tour-completed",
  active: "leadsy-product-tour-active",
  minimized: "leadsy-product-tour-minimized",
  step: "leadsy-product-tour-step",
};

function readBoolean(key, fallback = false) {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) === "true";
}

function readNumber(key, fallback = 0) {
  if (typeof window === "undefined") return fallback;
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) ? value : fallback;
}

// Lazy initializers — read localStorage once at mount, before any effect runs.
// This eliminates the StrictMode race condition where the persistence effect
// (writing stale initial state) ran between the two invocations of the init
// effect, causing the tour to reset to step 0 on every cross-route navigation.
function initIsActive() {
  if (typeof window === "undefined") return false;
  const completed = readBoolean(STORAGE_KEYS.completed);
  const active = readBoolean(STORAGE_KEYS.active);
  return active || !completed;
}

function initCurrentStep() {
  if (typeof window === "undefined") return 0;
  const active = readBoolean(STORAGE_KEYS.active);
  if (!active) return 0;
  const step = readNumber(STORAGE_KEYS.step, 0);
  return Math.min(Math.max(step, 0), tourSteps.length - 1);
}

function initIsMinimized() {
  if (typeof window === "undefined") return false;
  const active = readBoolean(STORAGE_KEYS.active);
  return active ? readBoolean(STORAGE_KEYS.minimized) : false;
}

export function useTour() {
  const totalSteps = tourSteps.length;

  // State is initialised directly from localStorage — no useEffect needed.
  const [isActive, setIsActive] = useState(initIsActive);
  const [isMinimized, setIsMinimized] = useState(initIsMinimized);
  const [currentStep, setCurrentStep] = useState(initCurrentStep);

  // Persist every state change to localStorage so cross-route navigation
  // (which causes the component to unmount/remount) can restore correctly.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.active, String(isActive));
    window.localStorage.setItem(STORAGE_KEYS.minimized, String(isMinimized));
    window.localStorage.setItem(STORAGE_KEYS.step, String(currentStep));
  }, [isActive, isMinimized, currentStep]);

  const finishTour = useCallback(() => {
    setIsActive(false);
    setIsMinimized(false);
    setCurrentStep(0);
    window.localStorage.setItem(STORAGE_KEYS.completed, "true");
    window.localStorage.setItem(STORAGE_KEYS.active, "false");
    window.localStorage.setItem(STORAGE_KEYS.minimized, "false");
    window.localStorage.setItem(STORAGE_KEYS.step, "0");
  }, []);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    setIsMinimized(false);
    window.localStorage.setItem(STORAGE_KEYS.completed, "false");
    window.localStorage.setItem(STORAGE_KEYS.active, "true");
    window.localStorage.setItem(STORAGE_KEYS.step, "0");
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((step) => {
      if (step >= totalSteps - 1) {
        window.setTimeout(finishTour, 0);
        return step;
      }
      return step + 1;
    });
  }, [finishTour, totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep((step) => Math.max(0, step - 1));
  }, []);

  const goToStep = useCallback((index) => {
    setCurrentStep(Math.min(Math.max(index, 0), totalSteps - 1));
  }, [totalSteps]);

  const skipTour = useCallback(() => {
    finishTour();
  }, [finishTour]);

  const minimizeTour = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const restoreTour = useCallback(() => {
    setIsMinimized(false);
    setIsActive(true);
  }, []);

  const api = useMemo(() => ({
    isActive,
    isMinimized,
    currentStep,
    totalSteps,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    minimizeTour,
    restoreTour,
    goToStep,
  }), [currentStep, goToStep, isActive, isMinimized, minimizeTour, nextStep, prevStep, restoreTour, skipTour, startTour, totalSteps]);

  return api;
}
