import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  extractShadeCodePositions,
  medianPatchHex,
  parseRetailToWholesaleRows,
  type TextToken
} from "./thread-data-utils";
import type { ThreadColor } from "../src/types/thread";

const SHADE_CARD_URL = "https://consumer.guetermann.com/wp-content/uploads/2022/01/305362_Farbenkarte_Premium.pdf";
const CONVERSION_URL =
  "https://growyourownclothes.com/wp-content/uploads/2021/01/gutermann-thread-retail-wholesale-conversion-chart-v2.pdf";

const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, ".cache", "gutermann");
const SHADE_CARD_PATH = path.join(CACHE_DIR, "shade-card.pdf");
const CONVERSION_PATH = path.join(CACHE_DIR, "conversion-chart.pdf");
const OUTPUT_PATH = path.join(ROOT, "src", "data", "threads.json");

const RENDER_SCALE = 2;
const SWATCH_X_OFFSET = 47;
const SWATCH_Y_OFFSET = 0;
const PATCH_RADIUS_X = 18;
const PATCH_RADIUS_Y = 7;

type PdfPage = Awaited<ReturnType<Awaited<ReturnType<typeof loadPdf>>["getPage"]>>;

class CanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    return {
      canvas,
      context: canvas.getContext("2d")
    };
  }

  reset(holder: { canvas: ReturnType<typeof createCanvas> }, width: number, height: number) {
    holder.canvas.width = width;
    holder.canvas.height = height;
  }

  destroy(holder: { canvas: ReturnType<typeof createCanvas> | null; context: unknown }) {
    holder.canvas = null;
    holder.context = null;
  }
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });
  await downloadIfMissing(SHADE_CARD_URL, SHADE_CARD_PATH);
  await downloadIfMissing(CONVERSION_URL, CONVERSION_PATH);

  const [conversionPdf, shadePdf] = await Promise.all([loadPdf(CONVERSION_PATH), loadPdf(SHADE_CARD_PATH)]);
  const conversionMappings = await extractConversionMappings(conversionPdf);
  const conversionByWholesale = new Map(conversionMappings.map((mapping) => [mapping.wholesaleCode, mapping]));
  const shadeRecords = await extractShadeRecords(shadePdf, conversionByWholesale);

  const missingShadeCodes = conversionMappings
    .filter((mapping) => !shadeRecords.some((record) => record.wholesaleCode === mapping.wholesaleCode))
    .map((mapping) => mapping.wholesaleCode);

  if (missingShadeCodes.length > 0) {
    console.warn(`Conversion codes missing from shade card: ${missingShadeCodes.join(", ")}`);
  }

  await writeFile(OUTPUT_PATH, `${JSON.stringify(shadeRecords, null, 2)}\n`);
  console.log(`Wrote ${shadeRecords.length} thread colors to ${path.relative(ROOT, OUTPUT_PATH)}.`);
  console.log(`${shadeRecords.filter((record) => record.retailCode).length} colors include retail/name mappings.`);
}

async function downloadIfMissing(url: string, filePath: string) {
  try {
    await readFile(filePath);
    return;
  } catch {
    // Fetch below.
  }

  console.log(`Downloading ${url}`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(filePath, buffer);
}

async function loadPdf(filePath: string) {
  const data = new Uint8Array(await readFile(filePath));
  return pdfjsLib.getDocument({ data, disableWorker: true } as unknown as Parameters<typeof pdfjsLib.getDocument>[0]).promise;
}

async function extractConversionMappings(pdf: Awaited<ReturnType<typeof loadPdf>>) {
  const page = await pdf.getPage(1);
  const tokens = await getTextTokens(page);
  return parseRetailToWholesaleRows(tokens);
}

async function extractShadeRecords(
  pdf: Awaited<ReturnType<typeof loadPdf>>,
  conversionByWholesale: Map<string, { retailCode: string; name: string }>
): Promise<ThreadColor[]> {
  const records: ThreadColor[] = [];
  const seen = new Set<string>();

  for (let pageNumber = 2; pageNumber <= 5; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const tokens = await getTextTokens(page);
    const codePositions = extractShadeCodePositions(tokens, pageNumber);
    const rendered = await renderPage(page);
    const imageData = rendered.context.getImageData(0, 0, rendered.canvas.width, rendered.canvas.height).data;

    for (const position of codePositions) {
      if (seen.has(position.code)) {
        throw new Error(`Duplicate shade-card code ${position.code}`);
      }

      seen.add(position.code);
      const mapping = conversionByWholesale.get(position.code);
      const sampleX = (position.x + SWATCH_X_OFFSET) * RENDER_SCALE;
      const sampleY = (page.view[3] - (position.y + SWATCH_Y_OFFSET)) * RENDER_SCALE;

      records.push({
        wholesaleCode: position.code,
        retailCode: mapping?.retailCode ?? null,
        name: mapping?.name ?? null,
        hex: medianPatchHex(
          imageData,
          rendered.canvas.width,
          rendered.canvas.height,
          sampleX,
          sampleY,
          PATCH_RADIUS_X * RENDER_SCALE,
          PATCH_RADIUS_Y * RENDER_SCALE
        ),
        source: "shade-card"
      });
    }
  }

  return records.sort((left, right) => Number(left.wholesaleCode) - Number(right.wholesaleCode));
}

async function getTextTokens(page: PdfPage): Promise<TextToken[]> {
  const textContent = await page.getTextContent();

  return textContent.items.map((item) => {
    const textItem = item as { str: string; transform: number[] };
    return {
      str: textItem.str,
      x: textItem.transform[4] - page.view[0],
      y: textItem.transform[5]
    };
  });
}

async function renderPage(page: PdfPage) {
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");

  const renderParams = {
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
    canvasFactory: new CanvasFactory()
  } as unknown as Parameters<typeof page.render>[0];

  await page.render(renderParams).promise;

  return { canvas, context };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
