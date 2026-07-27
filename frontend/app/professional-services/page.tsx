import { Metadata } from "next";
import { ProfessionalServicesDashboard } from "./components/ps-dashboard";

export const metadata: Metadata = {
  title: "Professional Services Estimator | Leadsy",
  description: "Manage professional service estimations, templates, and rate cards.",
};

export default function ProfessionalServicesPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Professional Services Estimator</h1>
            <p className="text-muted-foreground">
              Manage estimations, complexity matrices, and rate cards for professional services projects.
            </p>
          </div>
        </div>
        
        <ProfessionalServicesDashboard />
      </div>
    </div>
  );
}
