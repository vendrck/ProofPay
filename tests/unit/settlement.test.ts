import { describe, expect, it } from "vitest";
import { normalizeRuling } from "@/server/ai/appeal";
import { planSettlement } from "@/server/jobs/settlement";

const usd = (minor: number) => ({ currency: "USD", minor });

describe("planSettlement", () => {
  it("maps 100% to a full release", () => {
    expect(planSettlement(usd(10_000), 100)).toEqual({ kind: "release", release: usd(10_000), returnedToClient: usd(0) });
  });
  it("maps 0% to a refund", () => {
    expect(planSettlement(usd(10_000), 0)).toEqual({ kind: "refund", release: usd(0), returnedToClient: usd(10_000) });
  });
  it("splits a partial release without losing a cent", () => {
    const plan = planSettlement(usd(9_999), 33);
    expect(plan.kind).toBe("partial");
    expect(plan.release.minor + plan.returnedToClient.minor).toBe(9_999);
    expect(plan.release.minor).toBe(3_299); // rounds down in the client's favour
  });
  it("treats a percentage that rounds to zero as a refund", () => {
    expect(planSettlement(usd(50), 1).kind).toBe("refund");
  });
  it("rejects out-of-range percentages", () => {
    expect(() => planSettlement(usd(100), 101)).toThrow();
    expect(() => planSettlement(usd(100), -1)).toThrow();
  });
});

describe("normalizeRuling", () => {
  const base = { rationale: "", considerations: [] };
  it("forces percentages that agree with the outcome", () => {
    expect(normalizeRuling({ ...base, outcome: "release", releasePercent: 40 }).releasePercent).toBe(100);
    expect(normalizeRuling({ ...base, outcome: "refund", releasePercent: 40 }).releasePercent).toBe(0);
    expect(normalizeRuling({ ...base, outcome: "partial", releasePercent: 100 }).releasePercent).toBe(99);
    expect(normalizeRuling({ ...base, outcome: "partial", releasePercent: 0 }).releasePercent).toBe(1);
    expect(normalizeRuling({ ...base, outcome: "partial", releasePercent: 60 }).releasePercent).toBe(60);
  });
});
