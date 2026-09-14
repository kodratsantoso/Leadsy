"use client";

import { useParams } from "next/navigation";
import { LeadsPageContent } from "../../LeadsPageContent";

export default function LeadsByIndustryPage() {
  const params = useParams();
  const industryId = params.industryId as string;

  return <LeadsPageContent initialIndustryId={industryId} />;
}
