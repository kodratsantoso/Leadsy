"use client";

import React, { useState, KeyboardEvent, ClipboardEvent } from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type TagInputProps = {
  value?: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxTags?: number;
};

export function TagInput({
  value = [],
  onChange,
  placeholder = "Add a tag...",
  disabled = false,
  className = "",
  maxTags,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addTag = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (maxTags && value.length >= maxTags) return;
    if (value.includes(trimmed)) {
      setInputValue("");
      return;
    }
    onChange([...value, trimmed]);
    setInputValue("");
  };

  const removeTag = (indexToRemove: number) => {
    if (disabled) return;
    onChange(value.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      e.preventDefault();
      removeTag(value.length - 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    if (!pasteData) return;

    const items = pasteData
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter((item) => item && !value.includes(item));

    if (items.length > 0) {
      const newTags = maxTags ? [...value, ...items].slice(0, maxTags) : [...value, ...items];
      onChange(newTags);
    }
  };

  return (
    <div
      className={`min-h-[42px] w-full rounded-xl border border-border bg-background p-1.5 transition-colors focus-within:border-[color:var(--brand)] focus-within:ring-1 focus-within:ring-[color:var(--brand)] ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      } ${className}`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((tag, idx) => (
          <Badge
            key={`${tag}-${idx}`}
            variant="neutral"
            className="inline-flex items-center gap-1 py-1 px-2.5 text-xs font-normal bg-muted/70 text-foreground border border-border/70 rounded-md"
          >
            <span>{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(idx)}
                className="hover:text-destructive focus:outline-hidden ml-0.5 rounded-xs"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {tag}</span>
              </button>
            )}
          </Badge>
        ))}

        {(!maxTags || value.length < maxTags) && !disabled && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={() => {
              if (inputValue.trim()) {
                addTag(inputValue);
              }
            }}
            placeholder={value.length === 0 ? placeholder : "Add more..."}
            className="flex-1 min-w-[120px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden px-2 py-1"
          />
        )}
      </div>
    </div>
  );
}
