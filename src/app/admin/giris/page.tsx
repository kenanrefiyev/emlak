import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current";
import { Logo } from "@/components/site/logo";
import { LoginForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Admin girişi" };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ xeta?: string }> }) {
  const user = await getCurrentUser();
  if (user?.role === "ADMIN") redirect("/admin");
  const { xeta } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-paper p-8 sm:p-10">
        <Logo tagline="idarəetmə paneli" />
        <h1 className="t-h3 mt-8">Admin girişi</h1>
        <p className="mt-1 mb-6 text-sm text-ink-2">Yalnız administrator hesabları üçün. Hesab `npm run admin:create` əmri ilə yaradılır.</p>
        {xeta === "icaze" && (
          <p role="alert" className="mb-5 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            Bu hesabın admin panelinə icazəsi yoxdur.
          </p>
        )}
        <LoginForm next="/admin" />
      </div>
    </main>
  );
}
