"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/store/useAuthStore";

interface PrivacyShieldProps {
  /** If true, renders a subtle dynamic watermark pattern across the screen. Defaults to true. */
  enableWatermark?: boolean;
  /** If true, blocks inspect shortcuts (F12, Cmd+Opt+I) and right click context menu. Defaults to true. */
  enableInspectGuard?: boolean;
  /** Optional custom container class */
  className?: string;
  children?: React.ReactNode;
}

export function PrivacyShield({
  enableWatermark = true,
  enableInspectGuard = true,
  className,
  children,
}: PrivacyShieldProps) {
  const user = useAuthStore((s) => s.user);
  const [timestamp, setTimestamp] = useState<string>("");

  useEffect(() => {
    // Generate formatted timestamp in local time
    const updateTime = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      setTimestamp(`${dateStr} ${timeStr}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut deterrence (F12, Cmd+Opt+I, Ctrl+Shift+I, Ctrl+U, etc.)
  useEffect(() => {
    if (!enableInspectGuard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+I / Cmd+Option+I (Inspect element)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i")) {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+J / Cmd+Option+J (Console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "J" || e.key === "j")) {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+C / Cmd+Option+C (Inspect DOM element)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "C" || e.key === "c")) {
        e.preventDefault();
        return false;
      }

      // Ctrl+U / Cmd+U (View source)
      if ((e.ctrlKey || e.metaKey) && (e.key === "U" || e.key === "u")) {
        e.preventDefault();
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      // Allow right-click inside form inputs/textareas for natural paste/copy operations
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      e.preventDefault();
      return false;
    };

    // Console warning message
    if (typeof window !== "undefined") {
      try {
        console.log(
          "%cLeadsy Security Shield%c\nUnauthorized tampering, reverse engineering, or inspection of this application is monitored and logged.",
          "color: #6366f1; font-size: 16px; font-weight: bold;",
          "color: #ef4444; font-size: 12px;"
        );
      } catch {
        // Ignore in restricted environments
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [enableInspectGuard]);

  // Construct SVG Data URI for dynamic forensics watermark
  const watermarkSvgUri = useMemo(() => {
    if (!enableWatermark || !user?.email) return null;

    const label = `${user.name || "User"} • ${user.email} • ${timestamp || "VERIFIED"}`;
    const svgText = `
      <svg xmlns="http://www.w3.org/2000/svg" width="360" height="180">
        <text 
          x="20" 
          y="120" 
          transform="rotate(-20 180 90)" 
          font-family="system-ui, -apple-system, sans-serif" 
          font-size="11" 
          font-weight="600" 
          fill="currentColor" 
          letter-spacing="0.5">
          ${label}
        </text>
      </svg>
    `.trim();

    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svgText)}")`;
  }, [enableWatermark, user?.email, user?.name, timestamp]);

  return (
    <>
      {watermarkSvgUri && (
        <div
          aria-hidden="true"
          className="privacy-watermark-layer"
          style={{ backgroundImage: watermarkSvgUri }}
        />
      )}
      {children}
    </>
  );
}
