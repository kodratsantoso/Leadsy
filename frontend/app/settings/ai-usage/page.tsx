'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * This standalone page has been consolidated into the "Usage & Health" tab
 * on Settings → AI Defaults, which reads from the richer ai_requests log
 * (per-model pricing, prompt/completion token split, currency conversion).
 * Kept as a redirect so old bookmarks/links don't 404.
 */
export default function AiUsagePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/ai-defaults?tab=usage');
  }, [router]);

  return (
    <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Redirecting to AI Defaults → Usage &amp; Health…
    </div>
  );
}
