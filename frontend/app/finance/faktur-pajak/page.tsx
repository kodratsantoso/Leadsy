import { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { FakturPajakView } from "@/components/finance/FakturPajakView";

export const metadata: Metadata = {
  title: "Faktur Pajak (DJP) | Finance Hub | Leadsy",
  description: "Faktur Pajak standar Direktorat Jenderal Pajak (DJP), NSFP tracking, and e-Faktur CSV export.",
};

export default function FakturPajakPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 p-6 space-y-6">
        <PageHeader
          title="Faktur Pajak (DJP e-Faktur)"
          description="Penerbitan Faktur Pajak elektronik standar DJP, validasi nomor seri faktur pajak, dan export file CSV e-Faktur."
        />

        <FakturPajakView />
      </div>
    </div>
  );
}
