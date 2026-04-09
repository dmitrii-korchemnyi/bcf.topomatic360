export type BcfVersion = "2.0" | "2.1" | "3.0";
export type BcfContainer = ".bcfzip" | ".bcf";

export type IssueStatus = "Новая" | "Активная" | "В работе" | "Устранена" | "Закрыта" | "Переоткрыта";
export type IssuePriority = "Низкий" | "Обычный" | "Высокий" | "Критический";
export type IssueType = "Замечание" | "Коллизия" | "Проверка" | "Вопрос" | "Предложение" | "Ошибка моделирования";
export type ComponentsMode = "Видимые" | "Выбранные" | "Все связанные";

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface CameraState {
  position: Point3D;
  direction: Point3D;
  up: Point3D;
}

export interface ComponentRef {
  elementId?: string;
  ifcGuid?: string;
  modelRef?: string;
  layerName?: string;
  elementName?: string;
  elementType?: string;
}

export interface Viewpoint {
  guid: string;
  title?: string;
  snapshotFileName?: string;
  snapshotBase64?: string;
  camera?: CameraState;
  componentsMode: ComponentsMode;
  components: ComponentRef[];
}

export interface CommentItem {
  guid: string;
  author: string;
  date: string;
  message: string;
  modifiedDate?: string;
  modifiedAuthor?: string;
}

export interface IssueTopic {
  guid: string;
  number: number;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  labels: string[];
  assignedTo?: string;
  area?: string;
  milestone?: string;
  deadline?: string;
  creationAuthor: string;
  creationDate: string;
  modifiedAuthor?: string;
  modifiedDate?: string;
  comments: CommentItem[];
  viewpoints: Viewpoint[];
}

export interface IssueProject {
  projectId: string;
  name: string;
  topics: IssueTopic[];
  importVersion?: BcfVersion;
  exportVersion?: BcfVersion;
}

export interface ImportResult {
  project: IssueProject;
  detectedVersion: BcfVersion;
  container: BcfContainer;
  warnings: string[];
}

export interface ExportOptions {
  version: BcfVersion;
  container: BcfContainer;
}

export interface ValidationMessage {
  level: "error" | "warning";
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  messages: ValidationMessage[];
}

export interface TopicDraft {
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  type: IssueType;
  labels: string[];
  assignedTo?: string;
  area?: string;
  milestone?: string;
  deadline?: string;
}

export const DEFAULT_TOPIC_DRAFT: TopicDraft = {
  title: "",
  description: "",
  status: "Новая",
  priority: "Обычный",
  type: "Замечание",
  labels: [],
  assignedTo: "",
  area: "",
  milestone: "",
  deadline: ""
};
