import { describe, expect, it } from "vitest";
import {
  matchUser,
  parseSessionCookie,
  passwordsMatch,
  signSession,
  verifySession,
} from "../lib/auth.js";

const SECRET = "n".repeat(32);

const users = [
  { id: "gautham", name: "Gautham", password: "gautham-secret" },
  { id: "wife", name: "Wife", password: "wife-secret" },
];

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

describe("matchUser", () => {
  it("returns the user whose password matched", () => {
    expect(matchUser(users, "gautham-secret")).toMatchObject({ id: "gautham" });
    expect(matchUser(users, "wife-secret")).toMatchObject({ id: "wife" });
  });

  it("returns null for a wrong password after checking every user", () => {
    expect(matchUser(users, "nope")).toBeNull();
  });
});

describe("session tokens", () => {
  it("round-trips a fresh signature with the user id", () => {
    const token = signSession(SECRET, "gautham", 1_800_000_000_000);
    expect(verifySession(SECRET, token, 1_700_000_000_000)).toEqual({
      ok: true,
      userId: "gautham",
    });
  });

  it("rejects expired, tampered, swapped-user, and empty tokens", () => {
    const token = signSession(SECRET, "gautham", 1_000);
    expect(verifySession(SECRET, token, 2_000).ok).toBe(false);
    expect(verifySession(SECRET, token.replace(/.$/, "0"), 0).ok).toBe(false);
    expect(verifySession(SECRET, token.replace("gautham", "wife"), 0).ok).toBe(
      false,
    );
    expect(verifySession(SECRET, "", 0).ok).toBe(false);
    expect(verifySession(SECRET, "nope", 0).ok).toBe(false);
  });

  it("reads the session cookie and ignores others", () => {
    const token = signSession(SECRET, "wife", 9);
    expect(parseSessionCookie(`other=1; cal_session=${token}`)).toBe(token);
    expect(parseSessionCookie("")).toBe("");
  });
});
