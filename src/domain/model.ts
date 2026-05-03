export type BcfVersion = "2.0" | "2.1" | "3.0";

export interface InternalBcfProject {
  projectId: string;
  name: string;
  issues: InternalBcfIssue[];
  extensions?: InternalBcfExtensions;
  sourceVersion?: BcfVersion;
}

export interface InternalBcfExtensions {
  topicTypes: string[];
  topicStatuses: string[];
  priorities: string[];
  users: string[];
  labels: string[];
  stages: string[];
}

export interface InternalBcfIssue {
  guid: string;
  displayId?: string;
  serverAssignedId?: string;
  title: string;
  description?: string;
  status: string;
  type: string;
  priority?: string;
  assignedTo?: string;
  labels?: string[];
  stage?: string;
  dueDate?: string;
  creationDate: string;
  creationAuthor: string;
  modifiedDate?: string;
  modifiedAuthor?: string;
  comments: InternalBcfComment[];
  viewpoints: InternalBcfViewpoint[];
  snippets?: InternalBcfSnippet[];
}

export interface InternalBcfComment {
  guid: string;
  date: string;
  author: string;
  text: string;
  viewpointGuid?: string;
  modifiedDate?: string;
  modifiedAuthor?: string;
}

export interface InternalBcfViewpoint {
  guid: string;
  index: number;
  filename: string;
  snapshot?: InternalBcfSnapshot;
  perspectiveCamera?: InternalBcfPerspectiveCamera;
  orthogonalCamera?: InternalBcfOrthogonalCamera;
  components: InternalBcfComponents;
  clippingPlanes: InternalBcfClippingPlane[];
  bitmaps?: InternalBcfBitmap[];
  lines?: InternalBcfLine[];
}

export interface InternalBcfSnapshot {
  filename: string;
  mimeType: "image/png" | "image/jpeg";
  data: Uint8Array;
}

export interface InternalBcfPoint {
  x: number;
  y: number;
  z: number;
}

export interface InternalBcfVector extends InternalBcfPoint {}

export interface InternalBcfPerspectiveCamera {
  cameraViewPoint: InternalBcfPoint;
  cameraDirection: InternalBcfVector;
  cameraUpVector: InternalBcfVector;
  fieldOfView: number;
  aspectRatio?: number;
}

export interface InternalBcfOrthogonalCamera {
  cameraViewPoint: InternalBcfPoint;
  cameraDirection: InternalBcfVector;
  cameraUpVector: InternalBcfVector;
  viewToWorldScale: number;
  aspectRatio?: number;
}

export interface InternalBcfClippingPlane {
  location: InternalBcfPoint;
  direction: InternalBcfVector;
}

export interface InternalBcfComponents {
  selection: InternalBcfComponentRef[];
  visibility: {
    defaultVisibility: boolean;
    exceptions: InternalBcfComponentRef[];
  };
  coloring: InternalBcfComponentColoring[];
}

export interface InternalBcfComponentRef {
  ifcGuid?: string;
  originatingSystem?: string;
  authoringToolId?: string;
}

export interface InternalBcfComponentColoring {
  color: string;
  components: InternalBcfComponentRef[];
}

export interface InternalBcfBitmap {
  reference: string;
  format?: string;
}

export interface InternalBcfLine {
  startPoint: InternalBcfPoint;
  endPoint: InternalBcfPoint;
}

export interface InternalBcfSnippet {
  type: string;
  reference?: string;
  referenceSchema?: string;
  content?: string;
}

export interface InternalBcfValidationMessage {
  code: string;
  message: string;
  path: string;
}

export interface InternalBcfValidationResult {
  errors: InternalBcfValidationMessage[];
  warnings: InternalBcfValidationMessage[];
}
