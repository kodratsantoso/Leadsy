import { redirect } from "next/navigation";

/**
 * Canonical Digital Signature & e-Meterai configuration lives in Integration Settings -> Tab Mekari Sign & e-Meterai.
 */
export default function MekariSignSettingsRedirectPage() {
  redirect("/settings/integrations?tab=mekari_sign");
}
