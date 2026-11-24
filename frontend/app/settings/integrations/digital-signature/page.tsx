import { redirect } from "next/navigation";

/**
 * Legacy Digital Signature route consolidated into Integration Settings -> Tab Mekari Sign & e-Meterai.
 */
export default function DigitalSignatureSettingsRedirectPage() {
  redirect("/settings/integrations?tab=mekari_sign");
}
