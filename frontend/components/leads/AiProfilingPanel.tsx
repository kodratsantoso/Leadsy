"use client";

import React, { useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, Building2, MapPin, Phone, Globe, Users, Briefcase, Target, TrendingUp, Shield, ExternalLink, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SourceEvidence {
  website_sources?: string[];
  maps_sources?: string[];
  other_sources?: string[];
}

interface ProfilingData {
  company_name?: string;
  legal_name?: string;
  brand?: string;
  abbreviation?: string;
  year_established?: string;
  ownership_type?: string;
  website?: string;
  address?: string;
  city?: string;
  province?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  industry?: string;
  industry_id?: number | string;
  industry_name?: string;
  sub_industry?: string;
  sub_industry_id?: number | string;
  sub_industry_name?: string;
  business_category?: string;
  business_category_id?: number | string;
  business_category_name?: string;
  primary_sector?: string;
  vertical?: string;
  core_product?: string;
  specialization?: string;
  company_size?: string;
  company_size_estimate?: string;
  operational_area_type?: string;
  branch_count?: number | string | null;
  business_model?: string;
  target_market?: string;
  corporate_structure?: string;
  manufacturing_capability?: string;
  product_brands?: string[];
  certifications_or_registrations?: string;
  customer_story?: string;
  presales_perspective?: string;
  confidence?: "low" | "medium" | "high";
  evidence?: SourceEvidence;
  sources?: string[];
  lat?: number;
  lng?: number;
}

interface AiProfilingPanelProps {
  status: "idle" | "researching" | "ready_for_review" | "failed";
  data: ProfilingData | null;
  onApply: (data: ProfilingData) => void;
  onClose: () => void;
}

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, icon, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
          {icon}
          {title}
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="p-3 space-y-2">{children}</div>}
    </div>
  );
};

const Field: React.FC<{ label: string; value?: string | number | null; highlight?: boolean; link?: boolean; icon?: React.ReactNode }> = ({ label, value, highlight, link }) => {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between items-start gap-2 text-xs py-1 border-b border-border/50 last:border-0">
      <span className="font-medium text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right ${highlight ? "font-semibold text-foreground" : "text-foreground/90"}`}>
        {link && typeof value === "string" ? (
          <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-[var(--brand)] hover:underline inline-flex items-center gap-0.5 break-all">
            {value}
            <ExternalLink className="h-3 w-3 inline" />
          </a>
        ) : (
          <span className="break-words">{String(value)}</span>
        )}
      </span>
    </div>
  );
};

const TagList: React.FC<{ label: string; items?: string[] }> = ({ label, items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 text-xs py-1 border-b border-border/50 last:border-0">
      <span className="font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1 justify-end">
        {items.map((item, idx) => (
          <Badge key={idx} variant="neutral" className="text-[10px] px-1.5 py-0">{item}</Badge>
        ))}
      </div>
    </div>
  );
};

export const AiProfilingPanel: React.FC<AiProfilingPanelProps> = ({
  status,
  data,
  onApply,
  onClose,
}) => {
  if (status === "idle") return null;

  return (
    <div className="border border-[var(--brand)]/30 rounded-xl bg-[var(--brand)]/5 my-2 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--brand)]/10 border-b border-[var(--brand)]/20">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--brand)]">
          <Sparkles className="h-4 w-4" />
          AI Lead Profiler — Comprehensive Research
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-6 px-2 text-xs">
          Dismiss
        </Button>
      </div>

      {status === "researching" && (
        <div className="flex flex-col items-center justify-center py-10 space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--brand)]" />
          <p className="text-sm text-muted-foreground animate-pulse text-center px-4">
            Menelusuri website resmi, direktori bisnis, registry pemerintah (Kemendag), platform lowongan kerja, dan sumber publik lainnya...
          </p>
          <p className="text-xs text-muted-foreground/70">Cross-referencing multiple sources for verified intelligence</p>
        </div>
      )}

      {status === "failed" && (
        <div className="flex items-center gap-3 text-destructive py-4 px-4 bg-destructive/10 m-3 rounded-lg border border-destructive/20 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Research Failed</p>
            <p className="text-xs text-muted-foreground">Tidak dapat mengumpulkan detail profiling untuk nama perusahaan ini. Coba nama yang lebih spesifik atau tambahkan lokasi.</p>
          </div>
        </div>
      )}

      {status === "ready_for_review" && data && (
        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Verification confidence:</span>
            <Badge variant={data.confidence === "high" ? "success" : data.confidence === "medium" ? "warning" : "neutral"}>
              {data.confidence ? data.confidence.toUpperCase() : "MEDIUM"}
            </Badge>
          </div>

          <Section title="Identitas Perusahaan" icon={<Building2 className="h-3.5 w-3.5" />}>
            <Field label="Nama Legal" value={data.legal_name || data.company_name} highlight />
            <Field label="Nama Komersial / Brand" value={data.brand} />
            <Field label="Abbreviation" value={data.abbreviation} />
            <Field label="Tahun Berdiri" value={data.year_established} />
            <Field label="Tipe Kepemilikan" value={data.ownership_type} />
          </Section>

          <Section title="Kontak & Lokasi" icon={<MapPin className="h-3.5 w-3.5" />}>
            <Field label="Alamat Lengkap" value={data.address} />
            <Field label="Kota" value={data.city} />
            <Field label="Provinsi" value={data.province} />
            <Field label="Telepon" value={data.phone} icon={<Phone className="h-3 w-3" />} />
            <Field label="WhatsApp" value={data.whatsapp} />
            <Field label="Email" value={data.email} />
            <Field label="Website" value={data.website} link />
          </Section>

          <Section title="Klasifikasi Industri" icon={<Briefcase className="h-3.5 w-3.5" />}>
            <Field label="Industry" value={data.industry_name || data.industry} highlight />
            <Field label="Sub-Industry" value={data.sub_industry_name || data.sub_industry} />
            <Field label="Business Category" value={data.business_category_name || data.business_category} />
            <Field label="Sektor Primer" value={data.primary_sector} />
            <Field label="Vertical" value={data.vertical} />
            <Field label="Produk Utama" value={data.core_product} />
            <Field label="Spesialisasi" value={data.specialization} />
          </Section>

          <Section title="Skala Perusahaan" icon={<Users className="h-3.5 w-3.5" />}>
            <Field label="Jumlah Karyawan" value={data.company_size} highlight />
            <Field label="Estimasi Detail" value={data.company_size_estimate} />
            <Field label="Tipe Area Operasional" value={data.operational_area_type} />
            <Field label="Jumlah Cabang" value={data.branch_count} />
          </Section>

          <Section title="Business Intelligence" icon={<Target className="h-3.5 w-3.5" />}>
            <Field label="Model Bisnis" value={data.business_model} highlight />
            <Field label="Target Pasar" value={data.target_market} />
            <Field label="Struktur Korporasi" value={data.corporate_structure} />
            <Field label="Kapabilitas Produksi" value={data.manufacturing_capability} />
            <TagList label="Brand Produk" items={data.product_brands} />
            <Field label="Sertifikasi / Registrasi" value={data.certifications_or_registrations} />
          </Section>

          {data.customer_story && (
            <Section title="Company Overview" icon={<TrendingUp className="h-3.5 w-3.5" />}>
              <div className="bg-muted/40 p-3 rounded-lg">
                <p className="text-xs leading-relaxed text-foreground/90">{data.customer_story}</p>
              </div>
            </Section>
          )}

          {data.presales_perspective && (
            <Section title="Presales Perspective" icon={<Shield className="h-3.5 w-3.5" />} defaultOpen={false}>
              <div className="bg-[var(--brand)]/5 border border-[var(--brand)]/20 p-3 rounded-lg">
                <p className="text-xs leading-relaxed text-foreground/90">{data.presales_perspective}</p>
              </div>
            </Section>
          )}

          {(data.sources && data.sources.length > 0) || (data.evidence && (data.evidence.website_sources?.length || data.evidence.maps_sources?.length)) ? (
            <Section title="Sumber & Referensi" icon={<Globe className="h-3.5 w-3.5" />} defaultOpen={false}>
              <div className="flex flex-wrap gap-1.5">
                {(data.sources && data.sources.length > 0 ? data.sources : data.evidence?.website_sources)?.map((s, idx) => (
                  <a
                    key={idx}
                    href={s.startsWith("http") ? s : `https://${s}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded text-[10px] text-[var(--brand)] hover:bg-[var(--brand)]/10 transition-colors border max-w-full"
                  >
                    <span className="truncate max-w-[200px]">{s.replace(/^https?:\/\//, "").split("/")[0]}</span>
                    <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                  </a>
                ))}
                {data.evidence?.maps_sources?.map((_, idx) => (
                  <span key={`maps-${idx}`} className="bg-muted px-2 py-1 rounded text-[10px] border">
                    Google Maps
                  </span>
                ))}
              </div>
            </Section>
          ) : null}

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button size="sm" onClick={() => onApply(data)} className="w-full flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Apply Profiling Data
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
