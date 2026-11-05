import type { Metadata } from "next";
import { getSiteUrl } from "./site-url";

const OG_IMAGE_PATH = "/og/leadsy-og.png";

const title = "Leadsy — Lead Intelligence Platform";
const description =
  "Geo-intelligence, AI-assisted lead qualification, and funnel orchestration for modern sales teams.";

/** Shared root metadata for Lark/crawler link previews (SSR HTML) & PWA installability. */
export function leadsyLinkPreviewMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  const ogImageUrl = `${siteUrl}${OG_IMAGE_PATH}`;

  return {
    metadataBase: new URL(siteUrl),
    applicationName: "Leadsy",
    title,
    description,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Leadsy",
    },
    formatDetection: {
      telephone: false,
    },
    icons: {
      icon: [
        { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
        { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
        { url: "/favicon-192.png", type: "image/png", sizes: "192x192" },
        { url: "/icon.png", type: "image/png", sizes: "32x32" },
        { url: "/favicon.ico", sizes: "any" },
      ],
      apple: [
        { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    openGraph: {
      type: "website",
      siteName: "Leadsy",
      title,
      description,
      url: "/",
      images: [
        {
          url: OG_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: "Leadsy — Lead Intelligence Platform",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export function leadsyOgImagePublicUrl(baseUrl?: string): string {
  return `${(baseUrl ?? getSiteUrl()).replace(/\/$/, "")}${OG_IMAGE_PATH}`;
}
