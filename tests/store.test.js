import { describe, expect, it } from "vitest";
import { monthKey } from "../lib/store.js";

describe("monthKey", () => {
  it("namespaces a month by user", () => {
    expect(monthKey("gautham", "2025-10")).toBe("user:gautham:2025-10");
    expect(monthKey("wife", "2025-10")).toBe("user:wife:2025-10");
  });

  it("rejects unknown users and junk months so keys cannot hop accounts", () => {
    expect(() => monthKey("admin", "2025-10")).toThrow();
    expect(() => monthKey("gautham", "2025-13")).toThrow();
    expect(() => monthKey("gautham/../wife", "2025-10")).toThrow();
  });
});
