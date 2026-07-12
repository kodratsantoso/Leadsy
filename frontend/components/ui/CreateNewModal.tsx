"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";

interface CreateNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  endpoint: string;
  payloadKey?: string; // e.g. "name", "title"
  additionalPayload?: Record<string, any>;
  onSuccess: (newItem: any) => void;
}

export function CreateNewModal({
  isOpen,
  onClose,
  title,
  endpoint,
  payloadKey = "name",
  additionalPayload = {},
  onSuccess,
}: CreateNewModalProps) {
  const [inputValue, setInputValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) {
      setError("This field is required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({
          [payloadKey]: inputValue,
          ...additionalPayload,
        }),
      });
      
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json.message || "Failed to create item.");
      }
      
      const newItem = json.data || json;
      onSuccess(newItem);
      setInputValue("");
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Enter value..."
              />
              {error && <p className="text-sm text-destructive mt-1">{error}</p>}
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
