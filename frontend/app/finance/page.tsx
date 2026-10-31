import { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { FinanceInvoicesView } from "@/components/finance/FinanceInvoicesView";

export const metadata: Metadata = {
  title: "Finance Hub | Invoices & Billing | Leadsy",
  description: "Enterprise Order-to-Cash billing, invoice automation, and revenue collection.",
};

export default function FinanceInvoicesPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 p-6 space-y-6">
        <PageHeader
          title="Finance Hub: Invoices & Billing"
          description="Pusat kontrol terpadu faktur komersial, termin penagihan, status pelunasan, dan otomasi billing scheduler."
        />

        <FinanceInvoicesView />
      </div>
    </div>
  );
}
