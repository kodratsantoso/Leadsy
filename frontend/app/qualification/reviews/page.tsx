'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * The Human Verification Queue was decommissioned 2026-09-12: ambiguous
 * ("need_review") leads are now resolved by the lead owner's Direct Manager
 * (or a super admin) marking the lead Eligible directly from the Lead Detail
 * page, instead of routing through a shared review queue. Kept as a redirect
 * so old bookmarks/links don't 404.
 */
export default function QualificationReviewsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/leads');
  }, [router]);

  return (
    <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Redirecting to Leads…
    </div>
  );
}
