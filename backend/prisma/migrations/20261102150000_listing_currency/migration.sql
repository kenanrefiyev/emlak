-- Explicit currency for listings and roommate ads, plus an exchange-rate cache.
-- Every existing listing and ad was priced in manat, so the AZN default is the
-- true original currency for all current rows; no amounts are changed. Adding a
-- column with a constant default does not rewrite the table in PostgreSQL.

ALTER TABLE "listings" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'AZN';
ALTER TABLE "roommate_ads" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'AZN';

-- Latest rates per currency, as units per 1 USD (filled by the app at runtime).
CREATE TABLE "exchange_rates" (
    "currency" TEXT NOT NULL,
    "per_usd" DOUBLE PRECISION NOT NULL,
    "provider_updated_at" TIMESTAMP(3) NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("currency")
);
