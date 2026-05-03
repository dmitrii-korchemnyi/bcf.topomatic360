import JSZip from "jszip";
import type {
  BcfVersion,
  InternalBcfComment,
  InternalBcfComponentRef,
  InternalBcfComponents,
  InternalBcfProject,
  InternalBcfSnapshot,
  InternalBcfViewpoint
} from "../domain/model";
import { EMPTY_COMPONENTS } from "../domain/defaults";
import { BcfUserError } from "../utils/errors";
import { createGuid } from "../utils/ids";
import { asArray, attr, isRecord, node, text, xmlParser } from "./xml";
import { bcfVersionSchema } from "./schema";

export async function parseBcfZip(data: Uint8Array): Promise<InternalBcfProject> {
  const zip = await JSZip.loadAsync(data);
  const versionFile = zip.file("bcf.version");
  const projectFile = zip.file("project.bcfp");

  if (!versionFile) {
    throw new BcfUserError("Ошибка: отсутствует bcf.version");
  }
  if (!projectFile) {
    throw new BcfUserError("Ошибка: отсутствует project.bcfp");
  }

  const version = parseVersion(await versionFile.async("string"));
  const project = parseProject(await projectFile.async("string"), version);
  const topicDirs = collectTopicDirs(zip);

  project.issues = await Promise.all(topicDirs.map((dir) => parseIssue(zip, dir, version)));
  return project;
}

function parseVersion(xml: string): BcfVersion {
  const parsed = xmlParser.parse(xml);
  const versionNode = node(parsed, "Version");
  const version = attr(versionNode, "VersionId") ?? text(node(versionNode, "VersionId"));
  const result = bcfVersionSchema.safeParse(version);
  if (!result.success) {
    throw new BcfUserError("Ошибка: неподдерживаемая версия");
  }
  return result.data;
}

function parseProject(xml: string, version: BcfVersion): InternalBcfProject {
  const parsed = xmlParser.parse(xml);
  const root = node(parsed, "ProjectExtension") ?? node(parsed, "Project");
  const projectNode = node(root, "Project") ?? root;

  return {
    projectId: attr(projectNode, "ProjectId") ?? text(node(projectNode, "ProjectId")) ?? createGuid(),
    name: text(node(projectNode, "Name")) ?? "BCF Project",
    issues: [],
    sourceVersion: version
  };
}

function collectTopicDirs(zip: JSZip): string[] {
  const dirs = new Set<string>();
  for (const path of Object.keys(zip.files)) {
    const match = /^([^/]+)\/markup\.bcf$/i.exec(path);
    if (match) {
      dirs.add(`${match[1]}/`);
    }
  }
  return [...dirs];
}

async function parseIssue(zip: JSZip, dir: string, version: BcfVersion) {
  const markupFile = zip.file(`${dir}markup.bcf`);
  if (!markupFile) {
    throw new BcfUserError("Ошибка: отсутствует markup.bcf");
  }

  const parsed = xmlParser.parse(await markupFile.async("string"));
  const markup = node(parsed, "Markup");
  const topicNode = node(markup, "Topic");
  if (!topicNode) {
    throw new BcfUserError("Ошибка: topic без GUID");
  }

  const viewpoints = await parseViewpoints(zip, dir, markup, version);

  return {
    guid: attr(topicNode, "Guid") ?? createGuid(),
    displayId: attr(topicNode, "Index"),
    serverAssignedId: attr(topicNode, "ServerAssignedId"),
    title: text(node(topicNode, "Title")) ?? "",
    description: text(node(topicNode, "Description")),
    status: text(node(topicNode, "TopicStatus")) ?? "Открыто",
    type: text(node(topicNode, "TopicType")) ?? "Замечание",
    priority: text(node(topicNode, "Priority")),
    assignedTo: text(node(topicNode, "AssignedTo")),
    labels: asArray(node(topicNode, "Labels")).flatMap((labels) => asArray(node(labels, "Label")).map((label) => text(label)).filter(isString)),
    stage: text(node(topicNode, "Stage")),
    dueDate: text(node(topicNode, "DueDate")),
    creationDate: text(node(topicNode, "CreationDate")) ?? new Date().toISOString(),
    creationAuthor: text(node(topicNode, "CreationAuthor")) ?? "unknown",
    modifiedDate: text(node(topicNode, "ModifiedDate")),
    modifiedAuthor: text(node(topicNode, "ModifiedAuthor")),
    comments: parseComments(markup),
    viewpoints
  };
}

function parseComments(markup: unknown): InternalBcfComment[] {
  return asArray(node(markup, "Comment")).map((commentNode) => ({
    guid: attr(commentNode, "Guid") ?? createGuid(),
    date: text(node(commentNode, "Date")) ?? new Date().toISOString(),
    author: text(node(commentNode, "Author")) ?? "unknown",
    text: text(node(commentNode, "Comment")) ?? "",
    viewpointGuid: attr(node(commentNode, "Viewpoint"), "Guid"),
    modifiedDate: text(node(commentNode, "ModifiedDate")),
    modifiedAuthor: text(node(commentNode, "ModifiedAuthor"))
  }));
}

async function parseViewpoints(zip: JSZip, dir: string, markup: unknown, version: BcfVersion): Promise<InternalBcfViewpoint[]> {
  const viewpointRefs = asArray(node(markup, "Viewpoints"));
  const refs = viewpointRefs.length > 0 ? viewpointRefs : zip.file(new RegExp(`^${escapeRegExp(dir)}.*\\.bcfv$`, "i"));

  return Promise.all(refs.map(async (ref, index) => {
    const filename = resolveViewpointFilename(ref, index);
    const file = zip.file(`${dir}${filename}`) ?? zip.file(filename);
    const parsed = file ? xmlParser.parse(await file.async("string")) : undefined;
    const viewpointRoot = parsed ? node(parsed, "VisualizationInfo") : undefined;
    const snapshot = await readSnapshot(zip, dir, ref, viewpointRoot);

    return {
      guid: attr(ref, "Guid") ?? text(node(ref, "Guid")) ?? createGuid(),
      index,
      filename,
      snapshot,
      perspectiveCamera: parsePerspectiveCamera(viewpointRoot),
      orthogonalCamera: parseOrthogonalCamera(viewpointRoot),
      components: parseComponents(node(viewpointRoot, "Components")),
      clippingPlanes: parseClippingPlanes(viewpointRoot)
    };
  }));
}

function resolveViewpointFilename(ref: unknown, index: number): string {
  const fromViewpoint = text(node(ref, "Viewpoint"));
  if (fromViewpoint) {
    return fromViewpoint;
  }
  if (typeof ref === "string") {
    return ref.replace(/^.*\//, "");
  }
  return index === 0 ? "viewpoint.bcfv" : `viewpoint-${index + 1}.bcfv`;
}

async function readSnapshot(zip: JSZip, dir: string, ref: unknown, viewpointRoot: unknown): Promise<InternalBcfSnapshot | undefined> {
  const candidate = text(node(ref, "Snapshot")) ?? text(node(viewpointRoot, "Snapshot")) ?? "snapshot.png";
  const file = zip.file(`${dir}${candidate}`) ?? zip.file(candidate);
  if (!file) {
    return undefined;
  }

  const data = await file.async("uint8array");
  const lower = candidate.toLocaleLowerCase("en-US");
  return {
    filename: candidate,
    mimeType: lower.endsWith(".jpg") || lower.endsWith(".jpeg") ? "image/jpeg" : "image/png",
    data
  };
}

function parsePerspectiveCamera(root: unknown) {
  const camera = node(root, "PerspectiveCamera");
  if (!camera) {
    return undefined;
  }

  const cameraViewPoint = parsePoint(node(camera, "CameraViewPoint"));
  const cameraDirection = parsePoint(node(camera, "CameraDirection"));
  const cameraUpVector = parsePoint(node(camera, "CameraUpVector"));
  const fieldOfView = parseNumber(text(node(camera, "FieldOfView")));
  if (!cameraViewPoint || !cameraDirection || !cameraUpVector || fieldOfView === undefined) {
    return undefined;
  }

  return {
    cameraViewPoint,
    cameraDirection,
    cameraUpVector,
    fieldOfView,
    aspectRatio: parseNumber(text(node(camera, "AspectRatio")))
  };
}

function parseOrthogonalCamera(root: unknown) {
  const camera = node(root, "OrthogonalCamera");
  if (!camera) {
    return undefined;
  }

  const cameraViewPoint = parsePoint(node(camera, "CameraViewPoint"));
  const cameraDirection = parsePoint(node(camera, "CameraDirection"));
  const cameraUpVector = parsePoint(node(camera, "CameraUpVector"));
  const viewToWorldScale = parseNumber(text(node(camera, "ViewToWorldScale")));
  if (!cameraViewPoint || !cameraDirection || !cameraUpVector || viewToWorldScale === undefined) {
    return undefined;
  }

  return {
    cameraViewPoint,
    cameraDirection,
    cameraUpVector,
    viewToWorldScale,
    aspectRatio: parseNumber(text(node(camera, "AspectRatio")))
  };
}

function parseComponents(root: unknown): InternalBcfComponents {
  if (!root) {
    return { ...EMPTY_COMPONENTS, selection: [], visibility: { defaultVisibility: true, exceptions: [] }, coloring: [] };
  }

  const selection = asArray(node(node(root, "Selection"), "Component")).map(parseComponentRef).filter(isDefined);
  const visibility = node(root, "Visibility");
  const exceptions = asArray(node(node(visibility, "Exceptions"), "Component")).map(parseComponentRef).filter(isDefined);
  const defaultVisibilityText = text(node(visibility, "DefaultVisibility"));
  const coloring = asArray(node(node(root, "Coloring"), "Color")).map((colorNode) => ({
    color: attr(colorNode, "Color") ?? "#ffffff",
    components: asArray(node(colorNode, "Component")).map(parseComponentRef).filter(isDefined)
  }));

  return {
    selection,
    visibility: {
      defaultVisibility: defaultVisibilityText ? defaultVisibilityText.toLocaleLowerCase("en-US") === "true" : true,
      exceptions
    },
    coloring
  };
}

function parseClippingPlanes(root: unknown) {
  return asArray(node(node(root, "ClippingPlanes"), "ClippingPlane")).map((plane) => {
    const location = parsePoint(node(plane, "Location"));
    const direction = parsePoint(node(plane, "Direction"));
    return location && direction ? { location, direction } : undefined;
  }).filter(isDefined);
}

function parseComponentRef(value: unknown): InternalBcfComponentRef | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  return {
    ifcGuid: attr(value, "IfcGuid"),
    originatingSystem: attr(value, "OriginatingSystem"),
    authoringToolId: attr(value, "AuthoringToolId")
  };
}

function parsePoint(value: unknown): { x: number; y: number; z: number } | undefined {
  const x = parseNumber(text(node(value, "X")));
  const y = parseNumber(text(node(value, "Y")));
  const z = parseNumber(text(node(value, "Z")));
  return x === undefined || y === undefined || z === undefined ? undefined : { x, y, z };
}

function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
