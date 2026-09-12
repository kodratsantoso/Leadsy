import { Metadata } from "next";
import { CustomerSuccessDashboard } from "./components/cs-dashboard";

export const metadata: Metadata = {
  title: "Customer Success | Leadsy",
  description: "Monitor customer health, churn risk, and proactive CSM alerts.",
};

export default function CustomerSuccessPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Success</h1>
          <p className="text-muted-foreground">
            Health scores, churn risk, and proactive alerts across active customers.
          </p>
        </div>

        <CustomerSuccessDashboard />
      </div>
    </div>
  );
}
