import { createHash, createHmac, randomBytes } from "node:crypto";

/** Random, URL-safe secret for session cookies and invite links (256 bits). */
export const newToken = () => randomBytes(32).toString("base64url");

/** What the database stores instead of the token itself: a DB leak can't be replayed as a login. */
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Keyed hash of a client IP, so the sign-up limit works without storing raw IPs. */
export const hashIp = (ip: string, secret: string) => createHmac("sha256", secret).update(`ip:${ip}`).digest("hex");
