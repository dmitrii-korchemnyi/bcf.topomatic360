import type { InternalBcfSnapshot, InternalBcfViewpoint } from "../domain/model";

export function enrichViewpointFromCadView(viewpoint: InternalBcfViewpoint, cadview: unknown): { viewpoint: InternalBcfViewpoint; warnings: string[] } {
  const warnings: string[] = [];
  const camera = readCamera(cadview);

  if (!camera) {
    warnings.push("Предупреждение: камера Topomatic недоступна для BCF viewpoint");
    return { viewpoint, warnings };
  }

  return {
    viewpoint: {
      ...viewpoint,
      perspectiveCamera: camera
    },
    warnings
  };
}

export async function captureSnapshot(cadview: unknown): Promise<{ snapshot?: InternalBcfSnapshot; warnings: string[] }> {
  if (!isRecord(cadview)) {
    return { warnings: ["Предупреждение: нет snapshot"] };
  }

  const capture = cadview.captureSnapshot ?? cadview.takeSnapshot ?? cadview.snapshot;
  if (typeof capture !== "function") {
    return { warnings: ["Предупреждение: нет snapshot"] };
  }

  const result = await capture.call(cadview);
  if (result instanceof Blob) {
    const bytes = new Uint8Array(await result.arrayBuffer());
    return { snapshot: { filename: "snapshot.png", mimeType: "image/png", data: bytes }, warnings: [] };
  }

  if (result instanceof Uint8Array) {
    return { snapshot: { filename: "snapshot.png", mimeType: "image/png", data: result }, warnings: [] };
  }

  return { warnings: ["Предупреждение: нет snapshot"] };
}

function readCamera(cadview: unknown): InternalBcfViewpoint["perspectiveCamera"] | undefined {
  if (!isRecord(cadview) || !isRecord(cadview.camera)) {
    return undefined;
  }

  const camera = cadview.camera;
  const position = readPoint(camera.position ?? camera.eye ?? camera.cameraViewPoint);
  const direction = readPoint(camera.direction ?? camera.cameraDirection);
  const up = readPoint(camera.up ?? camera.cameraUpVector);

  if (!position || !direction || !up) {
    return undefined;
  }

  return {
    cameraViewPoint: position,
    cameraDirection: direction,
    cameraUpVector: up,
    fieldOfView: readNumber(camera.fieldOfView) ?? 60,
    aspectRatio: readNumber(camera.aspectRatio)
  };
}

function readPoint(value: unknown): { x: number; y: number; z: number } | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const x = readNumber(value.x);
  const y = readNumber(value.y);
  const z = readNumber(value.z);
  return x === undefined || y === undefined || z === undefined ? undefined : { x, y, z };
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
