import { Metadata } from "next";
import { FinanceInvoicesView } from "@/components/finance/FinanceInvoicesView";

export const metadata: Metadata = {
  title: "Finance Hub | Invoices & Billing | Leadsy",
  description: "Enterprise Order-to-Cash billing, invoice automation, and revenue collection.",
};

export default function FinanceInvoicesPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finance Hub</h1>
          <p className="text-muted-foreground">
            Pusat kontrol terpadu faktur komersial, termin penagihan, status pelunasan, dan otomasi billing scheduler.
          </p>
        </div>

        <FinanceInvoicesView />
      </div>
    </div>
  );
}
