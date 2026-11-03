import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { onest } from "@/app/fonts";
import { loadMessages } from "@/i18n/messages";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "İdarəetmə paneli · Yuva", template: "%s · Yuva admin" },
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
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
