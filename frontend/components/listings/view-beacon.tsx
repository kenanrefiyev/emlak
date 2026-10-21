"use client";

import { useEffect } from "react";
import { recordViewAction } from "@/app/[locale]/listings/actions";

/** Records a real page view after the page is shown (prefetches never count). */
export function ViewBeacon({ listingId }: { listingId: string }) {
  useEffect(() => {
    const timer = window.setTimeout(() => void recordViewAction(listingId), 1500);
    return () => window.clearTimeout(timer);
  }, [listingId]);
  return null;
}
