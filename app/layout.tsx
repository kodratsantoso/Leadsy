import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Leadsy — Deprecated Root UI Tree",
  description:
    "Deprecated root Next.js tree. The active frontend source of truth lives under frontend/.",
};

// Runs synchronously before React hydration to prevent flash of wrong theme
const themeScript = `(function(){try{var t=localStorage.getItem('leadsy-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Anti-flash: apply stored theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Deprecated root UI tree. The live app is served from <code>frontend/</code>. Make UI changes in <code>frontend/app</code>, <code>frontend/components</code>, and <code>frontend/lib</code>.
          </div>
          {children}
        </Providers>
      </body>
    </html>
  );
}
