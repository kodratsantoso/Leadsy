"use client";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import DocumentNumberingView from "@/components/settings/DocumentNumberingView";

export default function DocumentNumberingPage() {
  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
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
