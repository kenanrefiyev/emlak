import type { routing } from "@/i18n/routing";
import type az from "./messages/az.json";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof az;
  }
}
