import { redirect } from "next/navigation";

export default function WhatsAppIndexPage() {
  redirect("/inbox?channel=whatsapp");
}
