import { Plus_Jakarta_Sans, Geist, Geist_Mono } from "next/font/google";

/**
 * Leadsy Centralized Typography Architecture
 * Single Source of Truth (SSOT) for font loading across the application.
 *
 * 1. Display Typography: Plus Jakarta Sans (Headlines, Page Titles, Section Headings, Marketing)
 * 2. Interface Typography: Geist Sans (Application Body, Navigation, Tables, Forms, Buttons, Dialogs)
 * 3. Technical Typography: Geist Mono (IDs, Endpoints, Code, JSON Payloads, Logs, Webhooks)
 *
 * All fonts are loaded with Next.js next/font/google to ensure self-hosted zero-layout-shift (CLS)
 * optimization and subresource inlining without runtime external dependencies.
 */

export const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
});

export const interfaceFont = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-interface",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
});

export const technicalFont = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-technical",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
});

/**
 * Combined CSS variable class names to inject on the root layout <html> or <body> element.
 */
export const fontVariables = `${displayFont.variable} ${interfaceFont.variable} ${technicalFont.variable}`;
