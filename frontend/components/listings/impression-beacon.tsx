"use client";

import { useEffect } from "react";
import { recordImpressionsAction } from "@/app/[locale]/listings/actions";

/**
 * Counts search-result impressions for the listings on this page once they
 * have been on screen for a moment. The server de-duplicates per visitor.
 */
export function ImpressionBeacon({ listingIds }: { listingIds: string[] }) {
  const key = listingIds.join(",");
  useEffect(() => {
    if (!key) return;
    const timer = window.setTimeout(() => void recordImpressionsAction(key.split(",")), 2000);
    return () => window.clearTimeout(timer);
  }, [key]);
  return null;
}
