import { CalendarPlus, MessageCircle } from "lucide-react";
import { googleCalendarLink, whatsappLink } from "@/lib/links";
import { cn } from "@/lib/ui";

export function WhatsAppButton({
  text,
  phone,
  label,
  className,
}: {
  text: string;
  phone?: string | null;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={whatsappLink(text, phone)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("btn-secondary hover:border-[#25D366] hover:text-[#128C7E]", className)}
    >
      <MessageCircle className="size-4" />
      {label}
    </a>
  );
}

export function GoogleCalendarButton({
  label,
  className,
  ...opts
}: Parameters<typeof googleCalendarLink>[0] & { label: string; className?: string }) {
  return (
    <a
      href={googleCalendarLink(opts)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("btn-secondary hover:border-[#4285F4] hover:text-[#1a56c4]", className)}
    >
      <CalendarPlus className="size-4" />
      {label}
    </a>
  );
}
