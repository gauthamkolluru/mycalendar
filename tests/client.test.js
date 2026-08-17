import { describe, expect, it } from "vitest";
import { monthNavDelta } from "../src/client.js";

function key(name, extras = {}) {
  return {
    key: name,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    target: null,
    ...extras,
  };
}

describe("monthNavDelta", () => {
  it("maps arrow keys to a month step", () => {
    expect(monthNavDelta(key("ArrowRight"))).toBe(1);
    expect(monthNavDelta(key("ArrowLeft"))).toBe(-1);
  });

  it("ignores other keys and modifier chords", () => {
    expect(monthNavDelta(key("ArrowUp"))).toBe(0);
    expect(monthNavDelta(key("Escape"))).toBe(0);
    expect(monthNavDelta(key("ArrowRight", { ctrlKey: true }))).toBe(0);
    expect(monthNavDelta(key("ArrowLeft", { altKey: true }))).toBe(0);
    expect(monthNavDelta(key("ArrowRight", { metaKey: true }))).toBe(0);
  });

  it("leaves arrows with the caret when typing", () => {
    expect(
      monthNavDelta(key("ArrowLeft", { target: { tagName: "INPUT" } })),
    ).toBe(0);
    expect(
      monthNavDelta(key("ArrowRight", { target: { tagName: "TEXTAREA" } })),
    ).toBe(0);
    expect(
      monthNavDelta(key("ArrowRight", { target: { tagName: "SELECT" } })),
    ).toBe(0);
    expect(
      monthNavDelta(
        key("ArrowLeft", { target: { tagName: "DIV", isContentEditable: true } }),
      ),
    ).toBe(0);
  });

  it("still steps the month from a day cell button", () => {
    expect(
      monthNavDelta(key("ArrowRight", { target: { tagName: "BUTTON" } })),
    ).toBe(1);
  });
});
