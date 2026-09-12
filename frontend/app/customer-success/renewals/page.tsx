import { Metadata } from "next";
import { RenewalsBoard } from "./renewals-board";

export const metadata: Metadata = {
  title: "Renewal Opportunities | Customer Success | Leadsy",
  description: "Track renewal, upsell, and cross-sell opportunities across active customers.",
};

export default function RenewalsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Renewal Opportunities</h1>
          <p className="text-muted-foreground">
            Contracts approaching renewal, plus cross-sell opportunities identified by AI.
          </p>
        </div>

        <RenewalsBoard />
      </div>
    </div>
  );
}
