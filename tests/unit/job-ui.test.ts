import { describe, expect, it } from "vitest";
import { describeEvent, describeReviewReason } from "@/app/jobs/describe-event";
import { jobProgress, stepState, STEPS, verificationRun } from "@/app/jobs/progress";
import { JOB_STATUSES } from "@/server/escrow/state-machine";
import { displayMoney, paypalLabel } from "@/lib/labels";

describe("jobProgress", () => {
  it("covers every status with a headline and a valid step", () => {
    const stepIds = new Set<string>(STEPS.map((s) => s.id));
    for (const status of JOB_STATUSES) {
      const p = jobProgress(status);
      expect(p.headline, status).not.toBe("");
      expect(p.message, status).not.toBe("");
      expect(stepIds.has(p.step), status).toBe(true);
    }
  });

  it("names whose turn it is", () => {
    expect(jobProgress("draft").turn).toBe("client");
    expect(jobProgress("funded").turn).toBe("freelancer");
    expect(jobProgress("submitted").turn).toBe("ai");
    expect(jobProgress("verified").turn).toBe("admin");
    expect(jobProgress("released").turn).toBe("nobody");
  });

  it("hands a failed verification back to the freelancer", () => {
    const p = jobProgress("submitted", { verificationFailed: true });
    expect(p.turn).toBe("freelancer");
    expect(p.headline).toMatch(/didn't finish/);
  });

  it("marks earlier steps done and later ones todo", () => {
    const p = jobProgress("submitted");
    expect(stepState("fund", p)).toBe("done");
    expect(stepState("verify", p)).toBe("current");
    expect(stepState("release", p)).toBe("todo");
    expect(stepState("release", jobProgress("released"))).toBe("done");
  });

  it("adds the dispute step only for disputes", () => {
    expect(jobProgress("released").dispute).toBe(false);
    expect(jobProgress("disputed").dispute).toBe(true);
  });
});

describe("verificationRun", () => {
  const now = new Date("2026-11-02T12:00:00Z");
  const at = (type: string, minutesAgo: number) => ({ type, createdAt: new Date(now.getTime() - minutesAgo * 60_000) });

  it("is running right after a submission or a (re)start", () => {
    expect(verificationRun([at("work.submitted", 1)], now)).toBe("running");
    expect(verificationRun([at("work.submitted", 30), at("verification.failed", 20), at("verification.started", 1)], now)).toBe("running");
  });

  it("is running as soon as a retry was requested", () => {
    expect(verificationRun([at("work.submitted", 30), at("verification.failed", 20), at("verification.retried", 0)], now)).toBe("running");
  });

  it("reports failures, including runs that went silent", () => {
    expect(verificationRun([at("work.submitted", 5), at("verification.started", 5), at("verification.failed", 1)], now)).toBe("failed");
    expect(verificationRun([at("verification.started", 11)], now)).toBe("failed");
  });

  it("is idle once a verdict exists or nothing was submitted", () => {
    expect(verificationRun([at("work.submitted", 5), at("verification.completed", 1)], now)).toBe("idle");
    expect(verificationRun([at("payment.authorized", 5)], now)).toBe("idle");
  });
});

describe("describeEvent", () => {
  const ctx = { amountMinor: 10000, currency: "USD" };
  const ev = (type: string, data: unknown = {}, actor = "system") => describeEvent({ type, actor, data }, ctx);

  it("says what PayPal did with the money", () => {
    expect(ev("payment.authorized")).toBe("PayPal is holding $100.00 from the client (not charged)");
    expect(ev("funds.released", { releasedMinor: 8000, returnedMinor: 2000 })).toBe(
      "Admin released $80.00; $20.00 returned to the client",
    );
    expect(ev("funds.released", { releasedMinor: 10000, returnedMinor: 0 })).toBe(
      "Admin released $100.00 to the freelancer",
    );
  });

  it("describes verdicts and appeals", () => {
    expect(ev("verification.completed", { overall: "pass" })).toMatch(/every criterion passed/);
    expect(ev("appeal.filed", {}, "client")).toBe("The client appealed the verdict");
    expect(ev("work.submitted", { files: 1 })).toMatch(/1 file changed/);
  });

  it("humanizes PayPal dispute webhooks", () => {
    expect(ev("CUSTOMER.DISPUTE.CREATED", { reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED" })).toBe(
      "Client opened a PayPal dispute (not received)",
    );
  });

  it("falls back to the raw type and tolerates bad payloads", () => {
    expect(ev("something.new")).toBe("something.new");
    expect(describeEvent({ type: "work.submitted", actor: "freelancer", data: null }, ctx)).toBe(
      "Freelancer submitted a pull request",
    );
  });
});

describe("labels", () => {
  it("formats money with a symbol", () => {
    expect(displayMoney(12345, "USD")).toBe("$123.45");
    expect(displayMoney(500, "EUR")).toBe("€5.00");
  });

  it("maps known PayPal values and sentence-cases unknown ones", () => {
    expect(paypalLabel("WAITING_FOR_SELLER_RESPONSE")).toBe("Waiting for us");
    expect(paypalLabel("SOME_NEW_VALUE")).toBe("Some new value");
    expect(paypalLabel(undefined)).toBe("Unknown");
  });
});

describe("describeReviewReason", () => {
  const criteria = [{ id: "7f0c2a52-1111-4222-8333-444455556666" }, { id: "9b1d3e64-aaaa-4bbb-8ccc-ddddeeeeffff" }];

  it("shows the criterion's number instead of its database id", () => {
    expect(describeReviewReason(`Criterion ${criteria[1]!.id} is uncertain.`, criteria)).toBe("Criterion 2 is uncertain.");
    expect(describeReviewReason(`Criterion ${criteria[0]!.id}: pass at low confidence (0.60).`, criteria)).toBe(
      "Criterion 1: pass at low confidence (0.60).",
    );
  });

  it("leaves other reasons alone", () => {
    const reason = "The diff was too large and was truncated before review.";
    expect(describeReviewReason(reason, criteria)).toBe(reason);
  });
});

describe("describeEvent labels added for the demo path", () => {
  const ctx = { amountMinor: 10000, currency: "USD" };
  it("never falls back to the raw type for events the app logs", () => {
    for (const type of ["freelancer.joined", "verification.retried", "verification.escalated"]) {
      expect(describeEvent({ type, actor: "ai", data: {} }, ctx), type).not.toBe(type);
    }
  });
});
