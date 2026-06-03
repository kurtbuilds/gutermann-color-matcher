import { converter, differenceCiede2000 } from "culori";
import type { ThreadColor, ThreadMatch } from "@/types/thread";

const toRgb = converter("rgb");
const deltaE = differenceCiede2000();

export function normalizeHex(input: string): string | null {
  const trimmed = input.trim();
  const withoutHash = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;

  if (/^[0-9a-fA-F]{3}$/.test(withoutHash)) {
    const [r, g, b] = withoutHash.split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  if (/^[0-9a-fA-F]{6}$/.test(withoutHash)) {
    return `#${withoutHash.toLowerCase()}`;
  }

  return null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function getReadableTextColor(hex: string): "#111827" | "#ffffff" {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return "#111827";
  }

  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return luminance > 0.58 ? "#111827" : "#ffffff";
}

export function findClosestThreads(hex: string, threads: ThreadColor[], limit = 8): ThreadMatch[] {
  const target = toRgb(hex);

  if (!target) {
    return [];
  }

  return threads
    .map((thread) => {
      const candidate = toRgb(thread.hex);
      return {
        ...thread,
        deltaE: candidate ? deltaE(target, candidate) : Number.POSITIVE_INFINITY
      };
    })
    .filter((thread) => Number.isFinite(thread.deltaE))
    .sort((left, right) => left.deltaE - right.deltaE)
    .slice(0, limit);
}
