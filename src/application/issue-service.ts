import { EMPTY_COMPONENTS } from "../domain/defaults";
import type { InternalBcfComponentRef, InternalBcfIssue, InternalBcfSnapshot, InternalBcfViewpoint } from "../domain/model";
import { createGuid } from "../utils/ids";

export interface CreateIssueInput {
  title: string;
  description?: string;
  author: string;
  status?: string;
  type?: string;
  priority?: string;
  assignedTo?: string;
  components?: InternalBcfComponentRef[];
  snapshot?: InternalBcfSnapshot;
}

export function createIssue(input: CreateIssueInput): InternalBcfIssue {
  const now = new Date().toISOString();
  const components = input.components ?? [];
  const viewpoint: InternalBcfViewpoint = {
    guid: createGuid(),
    index: 0,
    filename: "viewpoint.bcfv",
    snapshot: input.snapshot,
    components: {
      ...EMPTY_COMPONENTS,
      selection: components
    },
    clippingPlanes: []
  };

  return {
    guid: createGuid(),
    displayId: undefined,
    title: input.title.trim(),
    description: input.description?.trim(),
    status: input.status ?? "Открыто",
    type: input.type ?? "Замечание",
    priority: input.priority,
    assignedTo: input.assignedTo,
    creationDate: now,
    creationAuthor: input.author,
    comments: [],
    viewpoints: [viewpoint]
  };
}

export function isClosedIssue(issue: InternalBcfIssue): boolean {
  return issue.status.toLocaleLowerCase("ru-RU") === "закрыто" || issue.status.toLocaleLowerCase("en-US") === "closed";
}
