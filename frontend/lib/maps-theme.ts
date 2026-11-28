/// <reference types="@types/google.maps" />

import { useTheme } from "@/lib/theme-context";
import { ColorScheme } from "@vis.gl/react-google-maps";

export type GoogleMapTypeStyle = {
  elementType?: string;
  featureType?: string;
  stylers: Array<Record<string, unknown>>;
};

/**
 * Enterprise Google Maps Dark Mode Theme Palette (Night / Midnight).
 * Calibrated for optimal contrast with Leadsy dark mode design tokens.
 */
export const GOOGLE_MAPS_DARK_STYLES: GoogleMapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1e2430" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1e2430" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b949e" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cbd5e1" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#94a3b8" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#17282b" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#527e69" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2d3748" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a202c" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#a0aec0" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#4a5568" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a202c" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#e2e8f0" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#242d3d" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cbd5e1" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0f172a" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#475569" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#0f172a" }],
  },
];

/**
 * Hook to automatically synchronize Google Maps theme with Leadsy active theme.
 * Returns colorScheme for native controls and styles array for map tiles.
 */
export function useGoogleMapsTheme() {
  const { resolved } = useTheme();
  const isDark = resolved === "dark";

  return {
    isDark,
    colorScheme: isDark ? ColorScheme.DARK : ColorScheme.LIGHT,
    styles: isDark ? GOOGLE_MAPS_DARK_STYLES : undefined,
  };
}
