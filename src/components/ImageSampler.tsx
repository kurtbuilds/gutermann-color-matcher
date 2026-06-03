"use client";

import { ImageUp, Pipette } from "lucide-react";
import { useRef, useState } from "react";
import { rgbToHex } from "@/lib/color";

type ImageSamplerProps = {
  onPick: (hex: string) => void;
  selectedHex: string | null;
};

type LensState = {
  visible: boolean;
  left: number;
  top: number;
};

const LENS_SIZE = 132;
const SAMPLE_SIZE = 17;
const MAX_CANVAS_WIDTH = 760;
const MAX_CANVAS_HEIGHT = 430;

export function ImageSampler({ onPick, selectedHex }: ImageSamplerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lensRef = useRef<HTMLCanvasElement | null>(null);
  const [hasImage, setHasImage] = useState(false);
  const [lens, setLens] = useState<LensState>({ visible: false, left: 0, top: 0 });

  const loadImage = (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d", { willReadFrequently: true });
      if (!canvas || !context) {
        URL.revokeObjectURL(imageUrl);
        return;
      }

      const scale = Math.min(MAX_CANVAS_WIDTH / image.naturalWidth, MAX_CANVAS_HEIGHT / image.naturalHeight, 1);
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      setHasImage(true);
      URL.revokeObjectURL(imageUrl);
    };

    image.src = imageUrl;
  };

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height);

    return {
      x: Math.max(0, Math.min(canvas.width - 1, x)),
      y: Math.max(0, Math.min(canvas.height - 1, y)),
      left: event.clientX - rect.left,
      top: event.clientY - rect.top
    };
  };

  const updateLens = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event);
    const canvas = canvasRef.current;
    const lensCanvas = lensRef.current;
    const lensContext = lensCanvas?.getContext("2d");
    const context = canvas?.getContext("2d", { willReadFrequently: true });

    if (!point || !canvas || !context || !lensCanvas || !lensContext) {
      return;
    }

    const sourceX = Math.max(0, Math.min(canvas.width - SAMPLE_SIZE, point.x - Math.floor(SAMPLE_SIZE / 2)));
    const sourceY = Math.max(0, Math.min(canvas.height - SAMPLE_SIZE, point.y - Math.floor(SAMPLE_SIZE / 2)));

    lensCanvas.width = LENS_SIZE;
    lensCanvas.height = LENS_SIZE;
    lensContext.imageSmoothingEnabled = false;
    lensContext.clearRect(0, 0, LENS_SIZE, LENS_SIZE);
    lensContext.drawImage(canvas, sourceX, sourceY, SAMPLE_SIZE, SAMPLE_SIZE, 0, 0, LENS_SIZE, LENS_SIZE);
    drawLensOverlay(lensContext);

    setLens({
      visible: true,
      left: Math.min(Math.max(12, point.left + 18), Math.max(12, canvas.clientWidth - LENS_SIZE - 12)),
      top: Math.min(Math.max(12, point.top + 18), Math.max(12, canvas.clientHeight - LENS_SIZE - 12))
    });
  };

  const pickPixel = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(event);
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });

    if (!point || !context) {
      return;
    }

    const [r, g, b] = context.getImageData(point.x, point.y, 1, 1).data;
    onPick(rgbToHex(r, g, b));
  };

  return (
    <div className="control-group image-control">
      <div className="image-control-head">
        <label htmlFor="image-upload">Image</label>
        <label className="file-button" htmlFor="image-upload">
          <ImageUp size={17} strokeWidth={1.9} aria-hidden="true" />
          Upload
        </label>
      </div>
      <input
        id="image-upload"
        className="visually-hidden"
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            loadImage(file);
          }
        }}
      />
      <div className={`image-sampler ${hasImage ? "has-image" : ""}`}>
        {!hasImage ? (
          <div className="sampler-placeholder">
            <Pipette size={24} strokeWidth={1.8} aria-hidden="true" />
            <span>{selectedHex ?? "No image loaded"}</span>
          </div>
        ) : null}
        <canvas
          ref={canvasRef}
          className="sample-canvas"
          onPointerMove={updateLens}
          onPointerLeave={() => setLens((current) => ({ ...current, visible: false }))}
          onPointerDown={pickPixel}
          aria-label="Uploaded image pixel sampler"
        />
        <canvas
          ref={lensRef}
          className={`magnifier ${lens.visible ? "is-visible" : ""}`}
          style={{ left: lens.left, top: lens.top }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function drawLensOverlay(context: CanvasRenderingContext2D) {
  const center = LENS_SIZE / 2;
  context.strokeStyle = "rgba(255, 255, 255, 0.82)";
  context.lineWidth = 1;

  for (let step = 1; step < SAMPLE_SIZE; step += 1) {
    const position = (step / SAMPLE_SIZE) * LENS_SIZE;
    context.beginPath();
    context.moveTo(position, 0);
    context.lineTo(position, LENS_SIZE);
    context.moveTo(0, position);
    context.lineTo(LENS_SIZE, position);
    context.stroke();
  }

  context.strokeStyle = "rgba(17, 24, 39, 0.95)";
  context.lineWidth = 2;
  context.strokeRect(center - LENS_SIZE / SAMPLE_SIZE / 2, center - LENS_SIZE / SAMPLE_SIZE / 2, LENS_SIZE / SAMPLE_SIZE, LENS_SIZE / SAMPLE_SIZE);
}
