import { describe, expect, it } from "vitest";
import { findClosestThreads, normalizeHex, rgbToHex } from "./color";
import type { ThreadColor } from "@/types/thread";

const palette: ThreadColor[] = [
  { wholesaleCode: "001", retailCode: null, name: "Black", hex: "#000000", source: "shade-card" },
  { wholesaleCode: "002", retailCode: null, name: "Red", hex: "#ff0000", source: "shade-card" },
  { wholesaleCode: "003", retailCode: null, name: "Blue", hex: "#0000ff", source: "shade-card" }
];

describe("normalizeHex", () => {
  it("normalizes 3- and 6-digit hex colors", () => {
    expect(normalizeHex("#AbC")).toBe("#aabbcc");
    expect(normalizeHex("12FE9a")).toBe("#12fe9a");
  });

  it("rejects invalid colors", () => {
    expect(normalizeHex("red")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex("#1234567")).toBeNull();
  });
});

describe("rgbToHex", () => {
  it("clamps and rounds RGB channels", () => {
    expect(rgbToHex(256, 16.4, -2)).toBe("#ff1000");
  });
});

describe("findClosestThreads", () => {
  it("orders matches by perceptual color distance", () => {
    const matches = findClosestThreads("#fb0606", palette, 3);
    expect(matches.map((match) => match.wholesaleCode)).toEqual(["002", "001", "003"]);
    expect(matches[0].deltaE).toBeLessThan(matches[1].deltaE);
  });
});
