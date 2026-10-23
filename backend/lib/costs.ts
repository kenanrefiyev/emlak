/**
 * Transparent rental cost estimate. Pure: shared by the detail page, cards and
 * tests. An expense the owner did not state is "unknown" — never counted as 0 —
 * and every total says whether it is complete or only a lower bound.
 *
 * Running costs (utilities, internet, other) are entered for the whole home and
 * `costSharers` is how many people split them. Percent commission is a share
 * of one month's rent.
 *
 *   whole-unit price:  monthly   = rent + running costs
 *                      perPerson = monthly / sharers           (when sharers known)
 *   per-place price:   monthly   = rent + running costs / sharers  (one tenant's share;
 *                      a non-zero running cost with unknown sharers is unknown)
 *   upfront            = first month's rent + deposit + commission
 */

export type CostItem =
  | { kind: "amount"; value: number }
  /** Covered by the rent. */
  | { kind: "included" }
  /** Does not apply (no internet, no deposit, no commission). */
  | { kind: "none" }
  | { kind: "unknown" };

export interface CostInput {
  monthlyRent: number;
  pricePerPlace: boolean;
  utilities: "INCLUDED" | "PARTLY" | "NOT_INCLUDED";
  utilitiesCost: number | null;
  internet: boolean;
  internetCost: number | null;
  otherCosts: number | null;
  deposit: number | null;
  commissionType: "NONE" | "PERCENT" | "FIXED";
  commissionValue: number | null;
  costSharers: number | null;
}

export interface Total {
  /** Sum of the known parts. */
  value: number;
  /** false when at least one part is unknown, so `value` is a lower bound. */
  complete: boolean;
}

export interface CostBreakdown {
  /** "place" when the rent and totals are for one tenant's place, "unit" for the whole home. */
  basis: "unit" | "place";
  rent: number;
  rentPerPlace: boolean;
  utilities: CostItem;
  internet: CostItem;
  other: CostItem;
  deposit: CostItem;
  commission: CostItem;
  monthly: Total;
  perPerson: (Total & { sharers: number }) | null;
  upfront: Total;
}

const amount = (value: number): CostItem => (value === 0 ? { kind: "none" } : { kind: "amount", value });
const valueOf = (c: CostItem) => (c.kind === "amount" ? c.value : 0);
const sum = (items: CostItem[], base: number): Total => ({
  value: items.reduce((n, c) => n + valueOf(c), base),
  complete: items.every((c) => c.kind !== "unknown"),
});

export function rentalCosts(l: CostInput): CostBreakdown {
  const utilities: CostItem =
    l.utilities === "INCLUDED" ? { kind: "included" } : l.utilitiesCost != null ? amount(l.utilitiesCost) : { kind: "unknown" };
  const internet: CostItem = l.internetCost != null ? amount(l.internetCost) : l.internet ? { kind: "unknown" } : { kind: "none" };
  const other: CostItem = l.otherCosts != null ? amount(l.otherCosts) : { kind: "unknown" };
  const deposit: CostItem = l.deposit != null ? amount(l.deposit) : { kind: "unknown" };
  const commission: CostItem =
    l.commissionType === "NONE"
      ? { kind: "none" }
      : l.commissionValue == null
        ? { kind: "unknown" }
        : amount(l.commissionType === "PERCENT" ? Math.round((l.monthlyRent * l.commissionValue) / 100) : l.commissionValue);

  const running = [utilities, internet, other];
  const sharers = l.costSharers != null && l.costSharers >= 1 ? l.costSharers : null;
  const upfront = sum([deposit, commission], l.monthlyRent);
  let monthly: Total;
  let perPerson: CostBreakdown["perPerson"] = null;
  if (l.pricePerPlace) {
    const share = running.map((c): CostItem => (c.kind !== "amount" ? c : sharers ? { kind: "amount", value: c.value / sharers } : { kind: "unknown" }));
    const t = sum(share, l.monthlyRent);
    monthly = { value: Math.round(t.value), complete: t.complete };
  } else {
    monthly = sum(running, l.monthlyRent);
    if (sharers && sharers > 1) perPerson = { value: Math.round(monthly.value / sharers), complete: monthly.complete, sharers };
  }

  return {
    basis: l.pricePerPlace ? "place" : "unit",
    rent: l.monthlyRent,
    rentPerPlace: l.pricePerPlace,
    utilities,
    internet,
    other,
    deposit,
    commission,
    monthly,
    perPerson,
    upfront,
  };
}
