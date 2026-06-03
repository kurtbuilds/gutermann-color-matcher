import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ThreadColor } from "../src/types/thread";

const DATA_PATH = path.join(process.cwd(), "src", "data", "threads.json");

async function main() {
  const raw = await readFile(DATA_PATH, "utf8");
  const data = JSON.parse(raw) as ThreadColor[];

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("threads.json must contain at least one thread color.");
  }

  const seen = new Set<string>();
  let mappedCount = 0;

  for (const [index, thread] of data.entries()) {
    if (!/^\d{3}$/.test(thread.wholesaleCode)) {
      throw new Error(`Invalid wholesaleCode at index ${index}: ${thread.wholesaleCode}`);
    }

    if (thread.retailCode !== null && !/^\d{3}$/.test(thread.retailCode)) {
      throw new Error(`Invalid retailCode for wholesale ${thread.wholesaleCode}: ${thread.retailCode}`);
    }

    if (!/^#[0-9a-f]{6}$/.test(thread.hex)) {
      throw new Error(`Invalid hex for wholesale ${thread.wholesaleCode}: ${thread.hex}`);
    }

    if (thread.source !== "shade-card") {
      throw new Error(`Invalid source for wholesale ${thread.wholesaleCode}: ${thread.source}`);
    }

    if (seen.has(thread.wholesaleCode)) {
      throw new Error(`Duplicate wholesaleCode ${thread.wholesaleCode}`);
    }

    seen.add(thread.wholesaleCode);

    if (thread.retailCode && thread.name) {
      mappedCount += 1;
    }
  }

  if (mappedCount === 0) {
    throw new Error("threads.json must include at least one retail/name mapping.");
  }

  console.log(`Validated ${data.length} thread colors and ${mappedCount} retail/name mappings.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
