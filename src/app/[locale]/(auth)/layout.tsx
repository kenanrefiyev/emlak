import Image from "next/image";
import { AUTH_PHOTO } from "@/lib/area-photos";

/** Two-column auth shell: form on the left, a quiet room photo on the right (desktop). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell grid gap-10 py-10 lg:grid-cols-[minmax(0,32rem)_1fr] lg:py-16">
      <div className="min-w-0">{children}</div>
      <div className="relative hidden overflow-hidden rounded-[28px] lg:block">
        <Image src={AUTH_PHOTO.src} alt="" fill sizes="40vw" className="object-cover" />
      </div>
    </div>
  );
}
