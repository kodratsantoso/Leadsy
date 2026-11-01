import { redirect } from "next/navigation";

export default function WhatsAppLocalPage() {
  redirect("/inbox?channel=whatsapp&engine=local");
}
