import { redirect } from "next/navigation";

export default function WhatsAppQontakPage() {
  redirect("/inbox?channel=whatsapp&engine=qontak");
}
