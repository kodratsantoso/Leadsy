import { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { NsfpPoolView } from "@/components/finance/NsfpPoolView";

export const metadata: Metadata = {
  title: "NSFP Pool Management | Finance Hub | Leadsy",
  description: "Manajemen kuota Nomor Seri Faktur Pajak (NSFP) DJP Online dan tracking nomor berjalan.",
};

export default function NsfpPoolPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 p-6 space-y-6">
        <PageHeader
          title="Manajemen NSFP Pool (DJP e-Nofa)"
          description="Monitoring kuota Nomor Seri Faktur Pajak aktif, riwayat surat jatah DJP, dan alokasi berurutan otomatis."
        />

        <NsfpPoolView />
      </div>
    </div>
  );
}
