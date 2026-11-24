import { redirect } from "next/navigation";

/**
 * Canonical Email & SMTP configuration lives in Integration Settings -> Tab Email & SMTP.
 */
export default function EmailSettingsRedirectPage() {
  redirect("/settings/integrations?tab=email");
}
