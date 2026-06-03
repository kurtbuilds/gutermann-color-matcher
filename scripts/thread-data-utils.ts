import { rgbToHex } from "../src/lib/color";

export type ConversionMapping = {
  wholesaleCode: string;
  retailCode: string;
  name: string;
};

export type TextToken = {
  str: string;
  x: number;
  y: number;
};

export type ShadeCodePosition = {
  code: string;
  pageNumber: number;
  x: number;
  y: number;
};

export function normalizeCode(code: string): string {
  return code.trim().padStart(3, "0");
}

export function parseRetailToWholesaleRows(tokens: TextToken[]): ConversionMapping[] {
  const rows = groupTokensByRoundedY(tokens)
    .map((row) => row.filter((token) => token.str.trim() && token.str.trim() !== " ").sort((left, right) => left.x - right.x))
    .filter((row) => row.length > 0);

  const mappings: ConversionMapping[] = [];

  for (const row of rows) {
    for (let index = 0; index < row.length - 2; index += 1) {
      const name = row[index].str.trim();
      const retailCode = row[index + 1].str.trim();
      const wholesaleCode = row[index + 2].str.trim();

      if (!isNumericCode(name) && isNumericCode(retailCode) && isNumericCode(wholesaleCode)) {
        mappings.push({
          wholesaleCode: normalizeCode(wholesaleCode),
          retailCode: normalizeCode(retailCode),
          name
        });
        index += 2;
      }
    }
  }

  return dedupeMappings(mappings);
}

export function extractShadeCodePositions(tokens: TextToken[], pageNumber: number): ShadeCodePosition[] {
  return tokens
    .filter((token) => isNumericCode(token.str.trim()))
    .filter((token) => token.y >= 35 && token.y <= 660)
    .map((token) => ({
      code: normalizeCode(token.str),
      pageNumber,
      x: token.x,
      y: token.y
    }));
}

export function medianPatchHex(
  data: Uint8ClampedArray,
  canvasWidth: number,
  canvasHeight: number,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number
): string {
  const red: number[] = [];
  const green: number[] = [];
  const blue: number[] = [];

  const startX = Math.max(0, Math.round(centerX - radiusX));
  const endX = Math.min(canvasWidth - 1, Math.round(centerX + radiusX));
  const startY = Math.max(0, Math.round(centerY - radiusY));
  const endY = Math.min(canvasHeight - 1, Math.round(centerY + radiusY));

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const offset = (y * canvasWidth + x) * 4;
      const alpha = data[offset + 3];

      if (alpha < 200) {
        continue;
      }

      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];

      if (r > 248 && g > 248 && b > 248) {
        continue;
      }

      red.push(r);
      green.push(g);
      blue.push(b);
    }
  }

  if (red.length === 0) {
    return "#ffffff";
  }

  return rgbToHex(median(red), median(green), median(blue));
}

function groupTokensByRoundedY(tokens: TextToken[]): TextToken[][] {
  const grouped = new Map<number, TextToken[]>();

  for (const token of tokens) {
    const key = Math.round(token.y);
    const row = grouped.get(key) ?? [];
    row.push(token);
    grouped.set(key, row);
  }

  return [...grouped.entries()].sort((left, right) => right[0] - left[0]).map(([, row]) => row);
}

function isNumericCode(value: string): boolean {
  return /^\d{1,3}$/.test(value);
}

function dedupeMappings(mappings: ConversionMapping[]): ConversionMapping[] {
  const byWholesaleCode = new Map<string, ConversionMapping>();

  for (const mapping of mappings) {
    const existing = byWholesaleCode.get(mapping.wholesaleCode);
    if (existing && (existing.retailCode !== mapping.retailCode || existing.name !== mapping.name)) {
      throw new Error(`Conflicting mapping for wholesale ${mapping.wholesaleCode}`);
    }

    byWholesaleCode.set(mapping.wholesaleCode, mapping);
  }

  return [...byWholesaleCode.values()].sort((left, right) => left.wholesaleCode.localeCompare(right.wholesaleCode));
}

function median(values: number[]): number {
  values.sort((left, right) => left - right);
  return values[Math.floor(values.length / 2)];
}
