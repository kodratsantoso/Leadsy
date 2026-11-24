import { redirect } from "next/navigation";

/**
 * Canonical Webhook configuration lives in Integration Settings -> Tab Webhooks.
 */
export default function WebhooksSettingsRedirectPage() {
  redirect("/settings/integrations?tab=webhooks");
}
