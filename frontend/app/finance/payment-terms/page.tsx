import { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { PaymentTermsView } from "@/components/finance/PaymentTermsView";

export const metadata: Metadata = {
  title: "Payment Terms Setup | Finance Hub | Leadsy",
  description: "Setup model termin penagihan kalender dan milestone.",
};

export default function PaymentTermsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 p-6 space-y-6">
        <PageHeader
          title="Master Payment Terms"
          description="Konfigurasi model termin penagihan berbasis kalender (SaaS) dan termin berbasis progress / BAST (Project)."
        />

        <PaymentTermsView />
      </div>
    </div>
  );
}
