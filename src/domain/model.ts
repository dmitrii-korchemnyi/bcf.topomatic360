export type BcfVersion = "2.1" | "3.0" | "3.1";

export type IssueStatus = "Активно" | "Устранено" | "Закрыто";
export type IssuePriority = "Не задан" | "Низкий" | "Обычный" | "Высокий" | "Критический";
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
  fieldOfView?: number;
}

export interface ComponentRef {
  elementId?: string;
  ifcGuid?: string;
  modelRef?: string;
  layerName?: string;
  elementName?: string;
  elementType?: string;
  selected?: boolean;
  visible?: boolean;
  color?: string;
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
  version: BcfVersion;
  topics: IssueTopic[];
}

export interface TopicEditorInput {
  guid?: string;
  number?: number;
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
