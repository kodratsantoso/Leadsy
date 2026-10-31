import { Metadata } from "next";
import { PaymentTermsView } from "@/components/finance/PaymentTermsView";

export const metadata: Metadata = {
  title: "Payment Terms Setup | Finance Hub | Leadsy",
  description: "Setup model termin penagihan kalender dan milestone.",
};

export default function PaymentTermsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Payment Terms</h1>
          <p className="text-muted-foreground">
            Konfigurasi model termin penagihan berbasis kalender (SaaS) dan termin berbasis progress / BAST (Project).
          </p>
        </div>

        <PaymentTermsView />
      </div>
    </div>
  );
}
