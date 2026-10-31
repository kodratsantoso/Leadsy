import { Metadata } from "next";
import { NsfpPoolView } from "@/components/finance/NsfpPoolView";

export const metadata: Metadata = {
  title: "NSFP Pool | Finance Hub | Leadsy",
  description: "Manajemen kuota Nomor Seri Faktur Pajak dari DJP e-Nofa.",
};

export default function NsfpPoolPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pool Nomor Seri Faktur Pajak (NSFP)</h1>
          <p className="text-muted-foreground">
            Alokasi jatah nomor faktur pajak dari surat DJP e-Nofa untuk penomoran otomatis sequential.
          </p>
        </div>

        <NsfpPoolView />
      </div>
    </div>
  );
}
