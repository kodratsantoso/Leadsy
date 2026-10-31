"use client";

import React from "react";
import { LoadingState } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

interface AILoaderProps {
  className?: string;
  text?: string;
  fullScreen?: boolean;
}

export const AILoader: React.FC<AILoaderProps> = ({
  className,
  text = "Memproses kecerdasan AI...",
  fullScreen = false,
}) => {
  if (fullScreen) {
    return (
      <LoadingState
        variant="fullscreen"
        size="xl"
        label={text}
        description="Menghubungkan ke intelligence engine dan memproses data..."
        className={className}
      />
    );
  }

  return (
    <LoadingState
      variant="ai"
      size="md"
      label={text}
      description="Sistem sedang menganalisis dan memproses informasi secara otomatis"
      className={cn("my-2", className)}
    />
  );
};
