"use client";

import React, { useEffect, useRef, useState, memo } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TradingViewWidgetProps {
  symbol: string;
  theme?: "dark" | "light";
  height?: number | string;
}

function TradingViewWidget({
  symbol,
  theme = "dark",
  height = 420,
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Normalize symbol: ensure IDX: prefix
  const cleanSymbol = (symbol || "").trim().toUpperCase();
  const tvSymbol = cleanSymbol.startsWith("IDX:") ? cleanSymbol : `IDX:${cleanSymbol}`;
  const rawTicker = cleanSymbol.replace(/^IDX:/, "");

  useEffect(() => {
    setIsReady(false);
    const container = containerRef.current;
    if (!container) return;

    // Reset container HTML
    container.innerHTML = "";

    const widgetInner = document.createElement("div");
    widgetInner.className = "tradingview-widget-container__widget";
    widgetInner.style.height = "100%";
    widgetInner.style.width = "100%";
    container.appendChild(widgetInner);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: "D",
      timezone: "Asia/Jakarta",
      theme: theme,
      style: "1",
      locale: "id",
      enable_publishing: false,
      allow_symbol_change: false,
      calendar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      support_host: "https://www.tradingview.com",
    });

    script.onload = () => {
      setIsReady(true);
    };

    container.appendChild(script);

    // Timeout safety fallback
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1500);

    return () => {
      clearTimeout(timer);
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [tvSymbol, theme]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-border bg-card" style={{ height }}>
      {!isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/90 backdrop-blur-xs z-10 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-[color:var(--brand)]" />
          <span className="text-xs text-muted-foreground font-medium">Memuat Live Chart TradingView ({tvSymbol})...</span>
        </div>
      )}

      <div
        className="tradingview-widget-container h-full w-full"
        ref={containerRef}
      />

      <div className="absolute bottom-2 right-2 z-20">
        <a
          href={`https://id.tradingview.com/symbols/${tvSymbol}/`}
          target="_blank"
          rel="noreferrer"
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2 bg-background/85 hover:bg-background border border-border/70 shadow-xs gap-1 font-medium"
          >
            <span>Buka di TradingView ({rawTicker})</span>
            <ExternalLink className="h-3 w-3" />
          </Button>
        </a>
      </div>
    </div>
  );
}

export default memo(TradingViewWidget);
