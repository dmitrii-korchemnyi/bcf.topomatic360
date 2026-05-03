import type { InternalBcfComponents, InternalBcfExtensions, InternalBcfProject } from "./model";
import { createGuid } from "../utils/ids";

export const DEFAULT_EXTENSIONS: InternalBcfExtensions = {
  topicTypes: ["Ошибка", "Замечание", "Коллизия", "Информация"],
  topicStatuses: ["Открыто", "В работе", "Решено", "Закрыто"],
  priorities: ["Низкий", "Средний", "Высокий"],
  users: [],
  labels: [],
  stages: []
};

export const EMPTY_COMPONENTS: InternalBcfComponents = {
  selection: [],
  visibility: {
    defaultVisibility: true,
    exceptions: []
  },
  coloring: []
};

export function createEmptyProject(name = "Topomatic 360 BCF"): InternalBcfProject {
  return {
    projectId: createGuid(),
    name,
    issues: [],
    extensions: DEFAULT_EXTENSIONS
  };
}
