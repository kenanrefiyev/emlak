import { describe, expect, it } from "vitest";
import { amountScale, convert, convertBound, displayPrice, displayPriceText, displayRangeText, formatMoney, roundApprox, type MoneyView } from "@/lib/money";

// Units per 1 USD, roughly as published in late 2026.
const rates = { USD: 1, AZN: 1.7, TRY: 50 };
const view = (display: string, r: typeof rates | null = rates): MoneyView => ({ display, rates: r, ratesUpdatedAt: r ? "2026-11-02T00:00:00Z" : null });

describe("money formatting and conversion", () => {
  it("formats in the reader's locale with the sign after the number", () => {
    expect(formatMoney(1250, "AZN", "en")).toBe("1,250 ₼");
    expect(formatMoney(15000, "TRY", "tr")).toBe("15.000 ₺");
    expect(formatMoney(5, "GEL", "en")).toBe("5 GEL");
  });

  it("converts through USD and refuses without a rate", () => {
    expect(convert(170, "AZN", "TRY", rates)).toBeCloseTo(5000);
    expect(convert(170, "AZN", "AZN", null)).toBe(170);
    expect(convert(170, "AZN", "EUR", rates)).toBeNull();
    expect(convert(170, "AZN", "TRY", null)).toBeNull();
  });

  it("rounds approximate prices so they do not look exact", () => {
    expect(roundApprox(487.4)).toBe(487);
    expect(roundApprox(4874)).toBe(4870);
    expect(roundApprox(48_740)).toBe(48_700);
  });

  it("keeps the listing's own price and marks conversions as approximate", () => {
    const same = displayPrice(500, "AZN", view("AZN"), "en");
    expect(same).toEqual({ main: "500 ₼", approximate: false, original: "500 ₼" });
    const converted = displayPrice(500, "AZN", view("TRY"), "en");
    expect(converted.approximate).toBe(true);
    expect(converted.main).toBe("14,700 ₺");
    expect(converted.original).toBe("500 ₼");
    expect(displayPriceText(500, "AZN", view("TRY"), "en")).toBe("≈ 14,700 ₺");
  });

  it("falls back to the original currency when rates are missing", () => {
    expect(displayPrice(15000, "TRY", view("AZN", null), "en")).toEqual({ main: "15,000 ₺", approximate: false, original: "15,000 ₺" });
  });

  it("shows ranges with a single sign", () => {
    expect(displayRangeText(200, 280, "AZN", view("AZN"), "en")).toBe("200–280 ₼");
    expect(displayRangeText(200, 280, "AZN", view("TRY"), "en")).toBe("≈ 5,880–8,240 ₺");
  });

  it("widens converted search bounds so edge listings are kept", () => {
    expect(convertBound(100, "AZN", "TRY", rates, "min")).toBe(2941);
    expect(convertBound(100, "AZN", "TRY", rates, "max")).toBe(2942);
    expect(convertBound(100, "AZN", "EUR", rates, "max")).toBeNull();
  });

  it("scales sanity limits per currency without being an exchange rate", () => {
    expect(amountScale("AZN")).toBe(1);
    expect(amountScale("TRY")).toBe(50);
    expect(amountScale("XYZ")).toBe(1);
  });
});
