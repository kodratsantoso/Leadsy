'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNumberFormat } from '@/lib/hooks/use-number-format';
import {
  PackageCheck,
  Sparkles,
  Layers,
  TrendingUp,
  Percent,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

interface ProductBundleItem {
  id: number;
  name: string;
  code: string;
  category: string;
  standard_price: number;
  role: string;
}

interface ProductBundle {
  id: string;
  bundle_name: string;
  badge: string;
  recommended_for: string;
  items: ProductBundleItem[];
  pricing: {
    currency: string;
    standard_total: number;
    discount_percent: number;
    bundled_total: number;
    estimated_cogs: number;
    projected_gross_margin_percent: number;
  };
  sales_pitch: string;
}

interface SmartProductBundlingCardProps {
  leadId: number | string;
  leadName?: string;
  className?: string;
}

export function SmartProductBundlingCard({
  leadId,
  leadName,
  className,
}: SmartProductBundlingCardProps) {
  const toast = useToast();
  const { formatCurrency } = useNumberFormat();
  const [copiedPitch, setCopiedPitch] = React.useState(false);

  const { data, isLoading } = useQuery<{
    success: boolean;
    data: {
      lead_id: number;
      company_name: string;
      bundles: ProductBundle[];
    };
  }>({
    queryKey: ['smart-product-bundles', leadId],
    queryFn: async () => {
      const res = await apiFetch(`/leads/${leadId}/recommend-bundles`);
      if (!res.ok) throw new Error('Gagal memuat rekomendasi bundling produk.');
      return res.json();
    },
    enabled: !!leadId,
  });

  const bundles = data?.data?.bundles || [];

  const handleCopyPitch = (pitch: string) => {
    navigator.clipboard.writeText(pitch);
    setCopiedPitch(true);
    toast.success('Sales Pitch Disalin', 'Teks proposisi nilai berhasil disalin ke clipboard.');
    setTimeout(() => setCopiedPitch(false), 2500);
  };

  if (isLoading) {
    return (
      <Card className={cn("p-6 text-center border-border/70", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">Menganalisis kombinasi produk & margin optimal...</p>
      </Card>
    );
  }

  if (bundles.length === 0) return null;

  return (
    <div className={cn("space-y-4", className)}>
      {bundles.map((bundle) => (
        <Card key={bundle.id} className="overflow-hidden border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-3 border-b border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <PackageCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold">{bundle.bundle_name}</CardTitle>
                    <Badge variant="brand" className="text-[10px] font-semibold">{bundle.badge}</Badge>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    {bundle.recommended_for}
                  </CardDescription>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-medium text-muted-foreground block">Proyeksi Gross Margin</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {bundle.pricing.projected_gross_margin_percent}%
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {/* Items Included */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Komposisi Paket Solusi Terpadu ({bundle.items.length} Modul)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {bundle.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border bg-muted/20 text-xs space-y-1 relative"
                  >
                    <Badge variant="outline" className="text-[9px] font-medium">{item.role}</Badge>
                    <p className="font-semibold text-foreground truncate">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {formatCurrency(item.standard_price)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing & Margin Simulator Bar */}
            <div className="p-3 bg-muted/40 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Harga Standar Katalog:</span>
                  <span className="line-through text-muted-foreground font-mono">
                    {formatCurrency(bundle.pricing.standard_total)}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold block text-[10px]">
                    Bundled Price ({bundle.pricing.discount_percent}% Diskon):
                  </span>
                  <span className="text-sm font-bold text-foreground font-mono">
                    {formatCurrency(bundle.pricing.bundled_total)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="success" className="text-xs gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Margin Sehat ({bundle.pricing.projected_gross_margin_percent}%)
                </Badge>
              </div>
            </div>

            {/* Sales Pitch Guide */}
            <div className="border rounded-xl p-3 bg-card/60 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Panduan Pitching Sales (Value Proposition):
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyPitch(bundle.sales_pitch)}
                  className="h-6 px-2 text-[10px] gap-1 text-muted-foreground"
                >
                  {copiedPitch ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  {copiedPitch ? 'Tersalin' : 'Salin Pitch'}
                </Button>
              </div>
              <p className="text-muted-foreground italic leading-relaxed">
                "{bundle.sales_pitch}"
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
