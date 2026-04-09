import { CameraState, ComponentRef, Point3D } from "../domain/model";

function pointFromUnknown(value: any): Point3D | undefined {
  if (!value || typeof value !== "object") return undefined;
  const x = Number(value.x ?? value[0]);
  const y = Number(value.y ?? value[1]);
  const z = Number(value.z ?? value[2] ?? 0);
  if ([x, y, z].some(Number.isNaN)) return undefined;
  return { x, y, z };
}

export function mapSelectionToComponent(input: unknown, index: number): ComponentRef {
  const item = input as any;
  return {
    elementId: String(item?.id ?? item?.elementId ?? item?.uid ?? index + 1),
    ifcGuid: item?.ifcGuid ?? item?.GlobalId,
    modelRef: item?.modelRef ?? item?.modelName,
    layerName: item?.layer?.name ?? item?.layerName,
    elementName: item?.name ?? item?.title,
    elementType: item?.type ?? item?.className
  };
}

export function mapCamera(input: unknown): CameraState | undefined {
  const camera = input as any;
  const position = pointFromUnknown(camera?.position ?? camera?.eye ?? camera?.from);
  const direction = pointFromUnknown(camera?.direction ?? camera?.target ?? camera?.to);
  const up = pointFromUnknown(camera?.up ?? camera?.upVector ?? { x: 0, y: 0, z: 1 });
  if (!position || !direction || !up) return undefined;
  return { position, direction, up };
}
