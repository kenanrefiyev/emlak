"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Share2 } from "lucide-react";

/** Native share sheet where available, otherwise copies the page link. */
export function ShareButton({ title }: { title: string }) {
  const c = useTranslations("common");
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={copied ? c("copied") : c("share")}
      title={copied ? c("copied") : c("share")}
      onClick={async () => {
        const url = window.location.href;
        if (navigator.share) {
          await navigator.share({ title, url }).catch(() => undefined);
          return;
        }
        await navigator.clipboard.writeText(url).catch(() => undefined);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="size-5 text-ok" aria-hidden /> : <Share2 className="size-5" aria-hidden />}
    </button>
  );
}
