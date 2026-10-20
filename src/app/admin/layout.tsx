import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { onest } from "@/app/fonts";
import { loadMessages } from "@/i18n/messages";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "İdarəetmə paneli · Yuva", template: "%s · Yuva admin" },
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};

/**
 * The admin panel is its own root layout and is always Azerbaijani: it never
 * reads the public locale. Shared form components get the az messages for
 * their validation/error texts; admin-only copy is written in Azerbaijani.
 */
export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const messages = await loadMessages("az");
  return (
    <html lang="az" className={onest.variable}>
      <body className="min-h-dvh bg-gray">
        <NextIntlClientProvider locale="az" messages={messages} timeZone="Asia/Baku">
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
