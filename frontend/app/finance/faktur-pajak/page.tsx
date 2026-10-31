import { Metadata } from "next";
import { FakturPajakView } from "@/components/finance/FakturPajakView";

export const metadata: Metadata = {
  title: "Faktur Pajak (DJP) | Finance Hub | Leadsy",
  description: "Faktur Pajak standar Direktorat Jenderal Pajak (DJP), NSFP tracking, and e-Faktur CSV export.",
};

export default function FakturPajakPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Faktur Pajak (DJP e-Faktur)</h1>
          <p className="text-muted-foreground">
            Penerbitan Faktur Pajak elektronik standar DJP, validasi nomor seri faktur pajak, dan export file CSV e-Faktur.
          </p>
        </div>

        <FakturPajakView />
      </div>
    </div>
  );
}
