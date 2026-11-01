"use client";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import DocumentNumberingView from "@/components/settings/DocumentNumberingView";

export default function DocumentNumberingPage() {
  return (
    <div className="space-y-6 p-6 w-full max-w-7xl mx-auto">
      <div className="space-y-2">
        <BackToSettings />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Penomoran Dokumen Komersial</h1>
          <p className="text-sm text-muted-foreground">
            Konfigurasi format penomoran seri otomatis (Quotation, Sales Order, Invoice, BAST, SOW) khusus untuk tenant Anda.
          </p>
        </div>
      </div>

      <DocumentNumberingView />
    </div>
  );
}
