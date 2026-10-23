import { describe, expect, it } from "vitest";
import { rentalCosts, type CostInput } from "@/lib/costs";

const base: CostInput = {
  monthlyRent: 220,
  pricePerPlace: false,
  utilities: "NOT_INCLUDED",
  utilitiesCost: 25,
  internet: true,
  internetCost: 10,
  otherCosts: 0,
  deposit: 220,
  commissionType: "NONE",
  commissionValue: null,
  costSharers: null,
};

describe("rental cost estimate", () => {
  it("adds known running costs to the rent (220 + 35 = 255)", () => {
    const b = rentalCosts(base);
    expect(b.monthly).toEqual({ value: 255, complete: true });
    expect(b.upfront).toEqual({ value: 440, complete: true });
    expect(b.perPerson).toBeNull();
  });

  it("never counts an unknown cost as zero", () => {
    const b = rentalCosts({ ...base, utilitiesCost: null, deposit: null });
    expect(b.utilities).toEqual({ kind: "unknown" });
    expect(b.monthly).toEqual({ value: 230, complete: false });
    expect(b.upfront.complete).toBe(false);
  });

  it("treats included utilities and missing internet as known", () => {
    const b = rentalCosts({ ...base, utilities: "INCLUDED", utilitiesCost: null, internet: false, internetCost: null });
    expect(b.utilities).toEqual({ kind: "included" });
    expect(b.internet).toEqual({ kind: "none" });
    expect(b.monthly).toEqual({ value: 220, complete: true });
  });

  it("splits a whole-unit total between sharers", () => {
    const b = rentalCosts({ ...base, monthlyRent: 600, costSharers: 3 });
    expect(b.perPerson).toEqual({ value: 212, complete: true, sharers: 3 });
  });

  it("for a per-place price adds only the tenant's share of running costs", () => {
    const b = rentalCosts({ ...base, pricePerPlace: true, costSharers: 5 });
    expect(b.basis).toBe("place");
    expect(b.monthly).toEqual({ value: 227, complete: true });
    const unknownSharers = rentalCosts({ ...base, pricePerPlace: true });
    expect(unknownSharers.monthly.complete).toBe(false);
  });

  it("computes percent commission from one month's rent", () => {
    const b = rentalCosts({ ...base, commissionType: "PERCENT", commissionValue: 50 });
    expect(b.commission).toEqual({ kind: "amount", value: 110 });
    expect(b.upfront.value).toBe(550);
  });
});
