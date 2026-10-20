import { requireAdmin } from "@/server/auth/current";
import { getSettings } from "@/server/settings";
import { mailConfigured } from "@/server/mail";
import { storage } from "@/server/storage/driver";
import { AdminPage, Panel } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/admin-forms";

export const metadata = { title: "Sistem tənzimləmələri" };

export default async function AdminSettings() {
  await requireAdmin();
  const settings = await getSettings();
  const driver = storage().name;
  return (
    <AdminPage title="Sistem tənzimləmələri">
      <Panel title="Platforma qaydaları">
        <SettingsForm values={settings} />
      </Panel>
      <Panel title="Xarici xidmətlər">
        <dl className="grid gap-3 text-[0.9375rem] sm:grid-cols-2">
          <div>
            <dt className="font-semibold">E-poçt</dt>
            <dd className="text-ink-2">{mailConfigured() ? "SMTP qoşulub" : "Qoşulmayıb — məktublar yalnız server jurnalına yazılır (MAIL_DRIVER=console)."}</dd>
          </div>
          <div>
            <dt className="font-semibold">Şəkil saxlama</dt>
            <dd className="text-ink-2">{driver === "blob" ? "Vercel Blob" : "Lokal disk (UPLOAD_DIR) — serverless hostinqdə davamlı deyil."}</dd>
          </div>
          <div>
            <dt className="font-semibold">Onlayn ödəniş</dt>
            <dd className="text-ink-2">Qoşulmayıb — paketlər əl ilə aktivləşdirilir.</dd>
          </div>
        </dl>
      </Panel>
    </AdminPage>
  );
}
