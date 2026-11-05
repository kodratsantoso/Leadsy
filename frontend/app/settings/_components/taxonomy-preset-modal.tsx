"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Layers, Loader2, Package, Sparkles } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { throwIfApiError } from "@/lib/apiError";
import { apiFetch } from "@/lib/apiFetch";
import { cn } from "@/lib/utils";
import type { TaxonomyPresetListResponse, TaxonomyPresetSummary } from "@/types/api";

type TaxonomyPresetModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TaxonomyPresetModal({ open, onOpenChange }: TaxonomyPresetModalProps) {
  const qc = useQueryClient();
  const toast = useToast();
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [includeProducts, setIncludeProducts] = useState<boolean>(true);

  const presetsQuery = useQuery({
    queryKey: ["taxonomy-presets"],
    enabled: open,
    queryFn: async () => {
      const res = await apiFetch("/settings/taxonomy-presets");
      await throwIfApiError(res, "Gagal memuat katalog preset taksonomi.");
      return (await res.json()) as TaxonomyPresetListResponse;
    },
  });

  const presets = useMemo(
    () => presetsQuery.data?.data?.presets ?? [],
    [presetsQuery.data]
  );

  const tenantStatus = presetsQuery.data?.data?.tenant_status;

  useEffect(() => {
    if (!selectedKey && presets.length > 0) {
      setSelectedKey(presets[0].key);
    }
  }, [presets, selectedKey]);

  const selectedPreset: TaxonomyPresetSummary | null = useMemo(
    () => presets.find((item) => item.key === selectedKey) ?? null,
    [presets, selectedKey]
  );

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPreset) {
        throw new Error("Pilih salah satu preset terlebih dahulu.");
      }
      const res = await apiFetch("/settings/taxonomy-presets/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset_key: selectedPreset.key,
          include_products: selectedPreset.supports_products ? includeProducts : false,
        }),
      });
      await throwIfApiError(res, "Gagal menerapkan preset taksonomi.");
      return res.json();
    },
    onSuccess: (json) => {
      qc.invalidateQueries({ queryKey: ["taxonomy-presets"] });
      qc.invalidateQueries({ queryKey: ["industries"] });
      qc.invalidateQueries({ queryKey: ["business-categories"] });
      qc.invalidateQueries({ queryKey: ["newsletter-industries"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(
        "Vertical Preset Diterapkan",
        json?.message || "Taksonomi tenant berhasil disinkronkan secara aditif."
      );
      onOpenChange(false);
    },
    onError: (err) => {
      toast.fromError(err, "Gagal menerapkan preset taksonomi.");
    },
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Apply Vertical Taxonomy Preset"
      description="Provision Industry, Sub-Industry, dan Business Category (#LOB) terisolasi khusus untuk tenant aktif tanpa mengganggu data tenant lain."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => applyMutation.mutate()}
            disabled={applyMutation.isPending || !selectedPreset}
          >
            {applyMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Apply Preset to Tenant
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {tenantStatus ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-[color:var(--surface-subtle)] px-3.5 py-2.5 text-xs">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[color:var(--brand)]" />
              <span className="font-medium text-foreground">
                Tenant Scope #{tenantStatus.tenant_id ?? 1}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant={tenantStatus.is_isolated ? "brand" : "neutral"}>
                {tenantStatus.is_isolated ? "Isolated Tenant Taxonomy" : "Global Default Fallback"}
              </Badge>
              <Badge variant="outline">
                {tenantStatus.industries_count} Ind · {tenantStatus.business_categories_count} Cat
              </Badge>
            </div>
          </div>
        ) : null}

        {presetsQuery.isLoading ? (
          <div className="py-10 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : presets.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Tidak ada preset vertikal yang tersedia.
          </div>
        ) : (
          <div className="space-y-3">
            {presets.map((preset) => {
              const isSelected = preset.key === selectedKey;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setSelectedKey(preset.key)}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition-colors",
                    isSelected
                      ? "border-[color:var(--brand)] bg-[color:var(--brand)]/5"
                      : "border-border bg-card hover:bg-accent/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {preset.name}
                        </span>
                        <Badge variant={isSelected ? "brand" : "neutral"}>
                          {preset.vertical_label}
                        </Badge>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {preset.description}
                      </p>
                    </div>
                    <CheckCircle2
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0 transition-opacity",
                        isSelected
                          ? "text-[color:var(--brand)] opacity-100"
                          : "text-muted-foreground opacity-25"
                      )}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">
                      {preset.counts.industries} Segments / Industries
                    </Badge>
                    <Badge variant="outline">
                      {preset.counts.sub_industries} Sub-Industries
                    </Badge>
                    <Badge variant="outline">
                      {preset.counts.business_categories} Business Categories / #LOB
                    </Badge>
                    {preset.supports_products ? (
                      <Badge variant="info">
                        {preset.counts.products} Product Lines
                      </Badge>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedPreset?.supports_products ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-[color:var(--surface-subtle)] p-3.5 text-xs">
            <input
              type="checkbox"
              checked={includeProducts}
              onChange={(event) => setIncludeProducts(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-[color:var(--brand)]"
            />
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Package className="h-3.5 w-3.5 text-[color:var(--brand)]" />
                <span>Sertakan Katalog Produk & AI Fit Reference ({selectedPreset.counts.products} Lini Produk)</span>
              </div>
              <p className="text-muted-foreground">
                Menambahkan referensi solusi produk ke Master Products tenant ini untuk memperkaya AI Lead Profiling & Product Matching.
              </p>
            </div>
          </label>
        ) : null}
      </div>
    </Modal>
  );
}

