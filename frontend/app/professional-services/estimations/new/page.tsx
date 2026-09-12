import { Metadata } from "next";
import { Suspense } from "react";
import { EstimatorWizard } from "@/components/professional-services/estimator-wizard";

export const metadata: Metadata = {
  title: "New Estimation | Professional Services | Leadsy",
};

export default function NewEstimationPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 p-6">
        <Suspense fallback={null}>
          <EstimatorWizard />
        </Suspense>
      </div>
    </div>
  );
}
