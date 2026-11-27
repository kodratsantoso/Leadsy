"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WhatsAppIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/inbox?channel=whatsapp");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
      Mengalihkan ke WhatsApp Inbox...
    </div>
  );
}
