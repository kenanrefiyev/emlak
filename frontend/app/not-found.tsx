import Link from "next/link";
import "./globals.css";

// Shown for paths outside any locale or the admin panel (e.g. /xx/...). Kept in Azerbaijani, the default language.
export default function GlobalNotFound() {
  return (
    <html lang="az">
      <body className="grid min-h-dvh place-items-center bg-paper p-6 font-sans text-ink">
        <div>
          <p className="text-sm font-semibold text-brand">404</p>
          <h1 className="mt-2 text-3xl font-semibold">Səhifə tapılmadı</h1>
          <Link href="/az" className="btn btn-primary mt-6">
            Ana səhifə
          </Link>
        </div>
      </body>
    </html>
  );
}
