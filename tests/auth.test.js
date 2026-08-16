import { describe, expect, it } from "vitest";
import {
  parseSessionCookie,
  passwordsMatch,
  signSession,
  verifySession,
} from "../lib/auth.js";

const SECRET = "n".repeat(32);

describe("passwordsMatch", () => {
  it("accepts the configured password", () => {
    expect(passwordsMatch("correct horse", "correct horse")).toBe(true);
  });

  it("rejects wrong, empty, and non-string passwords", () => {
    expect(passwordsMatch("correct horse", "wrong")).toBe(false);
    expect(passwordsMatch("correct horse", "")).toBe(false);
    expect(passwordsMatch("correct horse", null)).toBe(false);
    expect(passwordsMatch("", "anything")).toBe(false);
  });
});

describe("session tokens", () => {
  it("round-trips a fresh signature", () => {
    const token = signSession(SECRET, 1_800_000_000_000);
    expect(verifySession(SECRET, token, 1_700_000_000_000)).toBe(true);
  });

  it("rejects expired, tampered, and empty tokens", () => {
    const token = signSession(SECRET, 1_000);
    expect(verifySession(SECRET, token, 2_000)).toBe(false);
    expect(verifySession(SECRET, token.replace(/.$/, "0"), 0)).toBe(false);
    expect(verifySession(SECRET, "", 0)).toBe(false);
    expect(verifySession(SECRET, "nope", 0)).toBe(false);
  });

  it("reads the session cookie and ignores others", () => {
    const token = signSession(SECRET, 9);
    expect(parseSessionCookie(`other=1; cal_session=${token}`)).toBe(token);
    expect(parseSessionCookie("")).toBe("");
  });
});
