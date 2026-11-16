"use client";
import * as THREE from "three";

// Each photo becomes a small "polaroid" texture. 192px is plenty for a card that is ~40–80px on
// the projector, and keeps 450 photos at ~90MB of GPU memory (with mipmaps).
const SIZE = 192;
const PAD = 10;

function polaroid(draw: (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fbfaf5";
  ctx.fillRect(0, 0, SIZE, SIZE);
  draw(ctx, PAD, PAD, SIZE - PAD * 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function fromImage(img: HTMLImageElement) {
  return polaroid((ctx, x, y, size) => {
    // cover-crop to a square
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - s) / 2;
    const sy = (img.naturalHeight - s) / 2;
    ctx.drawImage(img, sx, sy, s, s, x, y, size, size);
  });
}

/** Fake photo for the 450-photo performance test. */
export function demoTexture(i: number) {
  return polaroid((ctx, x, y, size) => {
    const hue = (i * 47) % 360;
    const g = ctx.createLinearGradient(x, y, x + size, y + size);
    g.addColorStop(0, `hsl(${hue} 70% 55%)`);
    g.addColorStop(1, `hsl(${(hue + 60) % 360} 70% 35%)`);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = "white";
    ctx.font = `bold ${size * 0.38}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(i + 1), x + size / 2, y + size / 2);
  });
}

// Limit parallel downloads so 450 thumbnails don't all hit the network at once.
const MAX_PARALLEL = 6;
let active = 0;
const waiting: (() => void)[] = [];

async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_PARALLEL) await new Promise<void>((r) => waiting.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

export function loadPhotoTexture(url: string): Promise<THREE.Texture> {
  return slot(
    () =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.decoding = "async";
        img.onload = () => resolve(fromImage(img));
        img.onerror = reject;
        img.src = url;
      }),
  );
}
