import { BcfReader as BcfReader30 } from "@parametricos/bcf-js";
import { BcfReader as BcfReader21 } from "@parametricos/bcf-js/2.1";
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
import { createGuid } from "../utils/ids";

type BcfJsReader = InstanceType<typeof BcfReader30>;

interface BcfJsProject {
  project_id?: string;
  name?: string;
  version?: string;
  markups?: BcfJsMarkup[];
}

interface BcfJsMarkup {
  topic?: BcfJsTopic;
  viewpoints?: BcfJsViewpoint[];
}

interface BcfJsTopic {
  guid?: string;
  index?: number;
  server_assigned_id?: string;
  title?: string;
  description?: string;
  topic_status?: string;
  topic_type?: string;
  priority?: string;
  assigned_to?: string;
  labels?: string[];
  stage?: string;
  due_date?: Date | string;
  creation_date?: Date | string;
  creation_author?: string;
  modified_date?: Date | string;
  modified_author?: string;
  comments?: BcfJsComment[];
  viewpoints?: BcfJsViewpointRef[];
  bim_snippets?: BcfJsSnippet[];
}

interface BcfJsComment {
  guid?: string;
  date?: Date | string;
  author?: string;
  comment?: string;
  viewpoint?: string;
  modified_date?: Date | string;
  modified_author?: string;
}

interface BcfJsViewpointRef {
  guid?: string;
  viewpoint?: string;
  snapshot?: string;
  index?: number;
}

interface BcfJsViewpoint {
  guid?: string;
  snapshot?: string;
  components?: {
    selection?: BcfJsComponent[];
    visibility?: {
      default_visibility?: boolean;
      exceptions?: BcfJsComponent[];
    };
    coloring?: Array<{
      color: string;
      components: BcfJsComponent[];
    }>;
  };
  perspective_camera?: {
    camera_view_point: BcfJsPoint;
    camera_direction: BcfJsPoint;
    camera_up_vector: BcfJsPoint;
    field_of_view: number;
    aspect_ratio?: number;
  };
  orthogonal_camera?: {
    camera_view_point: BcfJsPoint;
    camera_direction: BcfJsPoint;
    camera_up_vector: BcfJsPoint;
    view_to_world_scale: number;
    aspect_ratio?: number;
  };
  clipping_planes?: Array<{
    location: BcfJsPoint;
    direction: BcfJsPoint;
  }>;
}

interface BcfJsComponent {
  ifc_guid?: string;
  originating_system?: string;
  authoring_tool_id?: string;
}

interface BcfJsPoint {
  x: number;
  y: number;
  z: number;
}

interface BcfJsSnippet {
  snippet_type?: string;
  reference?: string;
  reference_schema?: string;
}

export async function parseBcfZipWithBcfJs(data: Uint8Array, version: Exclude<BcfVersion, "2.0">): Promise<InternalBcfProject> {
  const reader = version === "2.1" ? new BcfReader21() : new BcfReader30();
  await reader.read(data);

  const project = reader.project as BcfJsProject | undefined;
  if (!project) {
    throw new Error("bcf-js не вернул project");
  }

  const markups = project.markups ?? [];
  return {
    projectId: project.project_id ?? createGuid(),
    name: project.name ?? "BCF Project",
    sourceVersion: version,
    issues: markups.map((markup, index) => mapIssue(markup, reader, index))
  };
}

function mapIssue(markup: BcfJsMarkup, reader: BcfJsReader, index: number) {
  const topic = markup.topic;
  if (!topic?.guid) {
    throw new Error("Ошибка: topic без GUID");
  }

  const viewpointRefs = topic.viewpoints ?? [];
  const viewpoints = (markup.viewpoints ?? []).map((viewpoint, viewpointIndex) => {
    const ref = viewpointRefs[viewpointIndex];
    return mapViewpoint(topic.guid!, viewpoint, ref, reader, viewpointIndex);
  });

  return {
    guid: topic.guid,
    displayId: topic.index !== undefined ? String(topic.index) : undefined,
    serverAssignedId: topic.server_assigned_id,
    title: topic.title ?? "",
    description: topic.description,
    status: topic.topic_status ?? "Active",
    type: topic.topic_type ?? "Issue",
    priority: topic.priority,
    assignedTo: topic.assigned_to,
    labels: topic.labels,
    stage: topic.stage,
    dueDate: toIsoString(topic.due_date),
    creationDate: toIsoString(topic.creation_date) ?? new Date().toISOString(),
    creationAuthor: topic.creation_author ?? "unknown",
    modifiedDate: toIsoString(topic.modified_date),
    modifiedAuthor: topic.modified_author,
    comments: (topic.comments ?? []).map(mapComment),
    viewpoints,
    snippets: (topic.bim_snippets ?? []).map((snippet) => ({
      type: snippet.snippet_type ?? "unknown",
      reference: snippet.reference,
      referenceSchema: snippet.reference_schema
    }))
  };
}

function mapComment(comment: BcfJsComment): InternalBcfComment {
  return {
    guid: comment.guid ?? createGuid(),
    date: toIsoString(comment.date) ?? new Date().toISOString(),
    author: comment.author ?? "unknown",
    text: comment.comment ?? "",
    viewpointGuid: comment.viewpoint,
    modifiedDate: toIsoString(comment.modified_date),
    modifiedAuthor: comment.modified_author
  };
}

function mapViewpoint(topicGuid: string, viewpoint: BcfJsViewpoint, ref: BcfJsViewpointRef | undefined, reader: BcfJsReader, index: number): InternalBcfViewpoint {
  const snapshotName = ref?.snapshot ?? viewpoint.snapshot;
  const snapshot = snapshotName ? readSnapshot(reader, topicGuid, snapshotName) : undefined;

  return {
    guid: ref?.guid ?? viewpoint.guid ?? createGuid(),
    index: ref?.index ?? index,
    filename: ref?.viewpoint ?? (index === 0 ? "viewpoint.bcfv" : `viewpoint-${index + 1}.bcfv`),
    snapshot,
    perspectiveCamera: viewpoint.perspective_camera ? {
      cameraViewPoint: viewpoint.perspective_camera.camera_view_point,
      cameraDirection: viewpoint.perspective_camera.camera_direction,
      cameraUpVector: viewpoint.perspective_camera.camera_up_vector,
      fieldOfView: viewpoint.perspective_camera.field_of_view,
      aspectRatio: viewpoint.perspective_camera.aspect_ratio
    } : undefined,
    orthogonalCamera: viewpoint.orthogonal_camera ? {
      cameraViewPoint: viewpoint.orthogonal_camera.camera_view_point,
      cameraDirection: viewpoint.orthogonal_camera.camera_direction,
      cameraUpVector: viewpoint.orthogonal_camera.camera_up_vector,
      viewToWorldScale: viewpoint.orthogonal_camera.view_to_world_scale,
      aspectRatio: viewpoint.orthogonal_camera.aspect_ratio
    } : undefined,
    components: mapComponents(viewpoint.components),
    clippingPlanes: (viewpoint.clipping_planes ?? []).map((plane) => ({
      location: plane.location,
      direction: plane.direction
    }))
  };
}

function mapComponents(components: BcfJsViewpoint["components"]): InternalBcfComponents {
  if (!components) {
    return {
      ...EMPTY_COMPONENTS,
      selection: [],
      visibility: { defaultVisibility: true, exceptions: [] },
      coloring: []
    };
  }

  return {
    selection: (components.selection ?? []).map(mapComponent),
    visibility: {
      defaultVisibility: components.visibility?.default_visibility ?? true,
      exceptions: (components.visibility?.exceptions ?? []).map(mapComponent)
    },
    coloring: (components.coloring ?? []).map((entry) => ({
      color: entry.color,
      components: entry.components.map(mapComponent)
    }))
  };
}

function mapComponent(component: BcfJsComponent): InternalBcfComponentRef {
  return {
    ifcGuid: component.ifc_guid,
    originatingSystem: component.originating_system,
    authoringToolId: component.authoring_tool_id
  };
}

function readSnapshot(reader: BcfJsReader, topicGuid: string, snapshotName: string): InternalBcfSnapshot | undefined {
  const data = reader.getEntry(`${topicGuid}/${snapshotName}`);
  if (!data) {
    return undefined;
  }

  const lower = snapshotName.toLocaleLowerCase("en-US");
  return {
    filename: snapshotName,
    mimeType: lower.endsWith(".jpg") || lower.endsWith(".jpeg") ? "image/jpeg" : "image/png",
    data
  };
}

function toIsoString(value: Date | string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
