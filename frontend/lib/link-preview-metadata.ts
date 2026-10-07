import type { Metadata } from "next";
import { getSiteUrl } from "./site-url";

const OG_IMAGE_PATH = "/og/leadsy-og.png";

const title = "Leadsy — Lead Intelligence Platform";
const description =
  "Geo-intelligence, AI-assisted lead qualification, and funnel orchestration for modern sales teams.";

/** Shared root metadata for Lark/crawler link previews (SSR HTML). */
export function leadsyLinkPreviewMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  const ogImageUrl = `${siteUrl}${OG_IMAGE_PATH}`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    icons: {
      icon: [
        { url: "/favicon-192.png", type: "image/png", sizes: "192x192" },
        { url: "/icon.png", type: "image/png", sizes: "32x32" },
        { url: "/favicon.ico", sizes: "any" },
      ],
      apple: [{ url: "/favicon-192.png", sizes: "192x192" }],
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
