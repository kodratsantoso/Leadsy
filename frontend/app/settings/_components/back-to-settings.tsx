import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function BackToSettings() {
  return (
    <Link
      href="/settings"
      aria-label="Back to Settings"
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit")}
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Settings
    </Link>
  );
}

export { BackToSettings };
