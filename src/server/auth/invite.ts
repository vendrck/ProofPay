import { createHmac, timingSafeEqual } from "node:crypto";
import { appEnv } from "@/config/env";

/**
 * Invite links are derived, not stored: HMAC(AUTH_SECRET, job id). The client
 * can copy the link again at any time, nobody can forge one without the secret,
 * and it stops working once a freelancer takes the seat (see policy acceptInvite).
 */

const mac = (jobId: string, secret: string) => createHmac("sha256", secret).update(`invite:${jobId}`).digest("base64url");

export const inviteToken = (jobId: string, secret = appEnv().AUTH_SECRET) => `${jobId}.${mac(jobId, secret)}`;

export const invitePath = (jobId: string) => `/invite/${inviteToken(jobId)}`;

/** The job id the token is for, or null if it was tampered with. */
export function readInviteToken(token: string, secret = appEnv().AUTH_SECRET): string | null {
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const jobId = token.slice(0, dot);
  const expected = Buffer.from(inviteToken(jobId, secret));
  const actual = Buffer.from(token);
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? jobId : null;
}
