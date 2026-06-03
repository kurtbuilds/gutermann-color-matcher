import { describe, expect, it } from "vitest";
import { filterThreads } from "./filter";
import type { ThreadColor } from "@/types/thread";

const threads: ThreadColor[] = [
  { wholesaleCode: "000", retailCode: "010", name: "Black", hex: "#000000", source: "shade-card" },
  { wholesaleCode: "170", retailCode: "503", name: "Flax", hex: "#dcb596", source: "shade-card" },
  { wholesaleCode: "368", retailCode: null, name: null, hex: "#54182d", source: "shade-card" }
];

describe("filterThreads", () => {
  it("matches names, retail codes, and wholesale codes", () => {
    expect(filterThreads(threads, "flax")).toHaveLength(1);
    expect(filterThreads(threads, "503")[0].wholesaleCode).toBe("170");
    expect(filterThreads(threads, "368")[0].hex).toBe("#54182d");
  });

  it("returns all threads for empty queries", () => {
    expect(filterThreads(threads, "   ")).toEqual(threads);
  });
});
