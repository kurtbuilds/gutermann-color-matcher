import { describe, expect, it } from "vitest";
import { extractShadeCodePositions, parseRetailToWholesaleRows } from "./thread-data-utils";

describe("parseRetailToWholesaleRows", () => {
  it("parses retail, wholesale, and names from row tokens", () => {
    const mappings = parseRetailToWholesaleRows([
      { str: "Black", x: 10, y: 100 },
      { str: "010", x: 70, y: 100 },
      { str: "000", x: 95, y: 100 },
      { str: "Marine Aqua", x: 130, y: 100 },
      { str: "680", x: 210, y: 100 },
      { str: "167", x: 235, y: 100 },
      { str: "Color Name", x: 10, y: 120 }
    ]);

    expect(mappings).toEqual([
      { wholesaleCode: "000", retailCode: "010", name: "Black" },
      { wholesaleCode: "167", retailCode: "680", name: "Marine Aqua" }
    ]);
  });
});

describe("extractShadeCodePositions", () => {
  it("keeps row code tokens and skips headings outside the shade range", () => {
    expect(
      extractShadeCodePositions(
        [
          { str: "5", x: 100, y: 727 },
          { str: "80", x: 86, y: 221 },
          { str: "982", x: 86, y: 196 },
          { str: "100 m", x: 100, y: 688 },
          { str: "•", x: 50, y: 221 }
        ],
        3
      )
    ).toEqual([
      { code: "080", pageNumber: 3, x: 86, y: 221 },
      { code: "982", pageNumber: 3, x: 86, y: 196 }
    ]);
  });
});
