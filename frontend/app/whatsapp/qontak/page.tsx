"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WhatsAppQontakPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/inbox?channel=whatsapp&engine=qontak");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
      Mengalihkan ke WhatsApp Qontak Inbox...
    </div>
  );
}
