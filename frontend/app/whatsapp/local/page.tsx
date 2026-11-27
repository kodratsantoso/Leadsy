"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WhatsAppLocalPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/inbox?channel=whatsapp&engine=local");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
      Mengalihkan ke WhatsApp Inbox...
    </div>
  );
}
