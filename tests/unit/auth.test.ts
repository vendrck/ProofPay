import { describe, expect, it } from "vitest";
import { reservedForAdmin } from "@/server/auth/accounts";
import { inviteToken, readInviteToken } from "@/server/auth/invite";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { can, JOB_ACTIONS, type JobAction, partyOf, type Viewer } from "@/server/auth/policy";
import { safeNext } from "@/server/auth/session";
import { hashIp, hashToken, newToken } from "@/server/auth/tokens";

describe("passwords", () => {
  it("verifies the right password and rejects others", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("correct horse batterY", stored)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same password!")).not.toBe(await hashPassword("same password!"));
  });

  it("rejects malformed stored hashes instead of throwing", async () => {
    expect(await verifyPassword("x", "garbage")).toBe(false);
    expect(await verifyPassword("x", "bcrypt$1$2$3$a$b")).toBe(false);
  });
});

describe("tokens", () => {
  it("are random and stored only as a hash", () => {
    const a = newToken();
    expect(a).not.toBe(newToken());
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toContain(a);
  });

  it("hash IPs with the secret", () => {
    expect(hashIp("1.2.3.4", "s".repeat(32))).not.toBe(hashIp("1.2.3.4", "t".repeat(32)));
  });
});

describe("invite links", () => {
  const secret = "test-secret-".repeat(4);
  const jobId = "8f14e45f-ceea-467a-9575-6a2f7c4f3a11";

  it("round-trip to the job id", () => {
    expect(readInviteToken(inviteToken(jobId, secret), secret)).toBe(jobId);
  });

  it("reject tampering, another job and another secret", () => {
    const token = inviteToken(jobId, secret);
    expect(readInviteToken(token.slice(0, -1) + (token.endsWith("A") ? "B" : "A"), secret)).toBeNull();
    expect(readInviteToken(token.replace(jobId, "00000000-0000-4000-8000-000000000000"), secret)).toBeNull();
    expect(readInviteToken(token, "another-secret-".repeat(3))).toBeNull();
    expect(readInviteToken("no-dot", secret)).toBeNull();
  });
});

describe("job policy", () => {
  const client: Viewer = { userId: "c", admin: false };
  const freelancer: Viewer = { userId: "f", admin: false };
  const stranger: Viewer = { userId: "s", admin: false };
  const admin: Viewer = { userId: "a", admin: true };
  const job = { clientUserId: "c", freelancerUserId: "f" };
  const open = { clientUserId: "c", freelancerUserId: null };

  const allowed = (viewer: Viewer | null, j = job) => JOB_ACTIONS.filter((a: JobAction) => can(viewer, a, j));

  it("gives each party only its own actions", () => {
    expect(allowed(client)).toEqual(["view", "editCriteria", "fund", "appeal"]);
    expect(allowed(freelancer)).toEqual(["view", "submitWork", "retryVerification", "appeal"]);
    expect(allowed(admin)).toEqual(["view", "retryVerification", "settle"]);
  });

  it("gives strangers and logged-out visitors nothing", () => {
    expect(allowed(stranger)).toEqual([]);
    expect(allowed(null)).toEqual([]);
  });

  it("lets anyone but the client accept an open invite, once", () => {
    expect(can(stranger, "acceptInvite", open)).toBe(true);
    expect(can(client, "acceptInvite", open)).toBe(false);
    expect(can(stranger, "acceptInvite", job)).toBe(false);
  });

  it("knows which side the viewer is on", () => {
    expect(partyOf(client, job)).toBe("client");
    expect(partyOf(freelancer, job)).toBe("freelancer");
    expect(partyOf(admin, job)).toBeNull();
  });
});

describe("safeNext", () => {
  it("keeps same-site paths and drops everything else", () => {
    expect(safeNext("/jobs/1")).toBe("/jobs/1");
    expect(safeNext("https://evil.example")).toBe("/jobs");
    expect(safeNext("//evil.example")).toBe("/jobs");
    expect(safeNext("/\\evil.example")).toBe("/jobs");
    expect(safeNext(undefined)).toBe("/jobs");
  });
});

describe("reservedForAdmin", () => {
  const admins = ["admin@demo.dev"];
  it("blocks admin emails regardless of case and spacing", () => {
    expect(reservedForAdmin("admin@demo.dev", admins)).toBe(true);
    expect(reservedForAdmin("  Admin@Demo.DEV ", admins)).toBe(true);
  });
  it("lets everyone else sign up", () => {
    expect(reservedForAdmin("judge@example.com", admins)).toBe(false);
    expect(reservedForAdmin("admin@demo.dev", [])).toBe(false);
  });
});
