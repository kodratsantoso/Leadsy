"use client";

import { useParams } from "next/navigation";
import { CustomerSuccessDetail } from "./cs-detail";

export default function CustomerSuccessDetailPage() {
  const params = useParams();
  const leadId = parseInt(params.leadId as string);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 p-6">
        <CustomerSuccessDetail leadId={leadId} />
      </div>
    </div>
  );
}
