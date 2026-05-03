import type { InternalBcfProject, InternalBcfValidationResult } from "../domain/model";
import { isGuid } from "../utils/ids";

export function validateProject(project: InternalBcfProject): InternalBcfValidationResult {
  const result: InternalBcfValidationResult = { errors: [], warnings: [] };

  if (!project.projectId) {
    result.errors.push({ code: "project.id", message: "Ошибка: отсутствует projectId", path: "project.projectId" });
  }

  if (!project.name) {
    result.errors.push({ code: "project.name", message: "Ошибка: отсутствует имя проекта", path: "project.name" });
  }

  project.issues.forEach((issue, issueIndex) => {
    const issuePath = `issues[${issueIndex}]`;
    if (!issue.guid) {
      result.errors.push({ code: "topic.guid", message: "Ошибка: topic без GUID", path: `${issuePath}.guid` });
    } else if (!isGuid(issue.guid)) {
      result.errors.push({ code: "topic.guid.invalid", message: "Ошибка: topic GUID не соответствует RFC 4122", path: `${issuePath}.guid` });
    }

    if (!issue.title) {
      result.errors.push({ code: "topic.title", message: "Ошибка: topic без title", path: `${issuePath}.title` });
    }
    if (!issue.creationDate) {
      result.errors.push({ code: "topic.creationDate", message: "Ошибка: topic без creationDate", path: `${issuePath}.creationDate` });
    }
    if (!issue.creationAuthor) {
      result.errors.push({ code: "topic.author", message: "Ошибка: topic без author", path: `${issuePath}.creationAuthor` });
    }
    if (!issue.status) {
      result.errors.push({ code: "topic.status", message: "Ошибка: topic без status", path: `${issuePath}.status` });
    }

    issue.comments.forEach((comment, commentIndex) => {
      const commentPath = `${issuePath}.comments[${commentIndex}]`;
      if (!comment.guid) {
        result.errors.push({ code: "comment.guid", message: "Ошибка: comment без GUID", path: `${commentPath}.guid` });
      }
      if (!comment.author) {
        result.errors.push({ code: "comment.author", message: "Ошибка: comment без author", path: `${commentPath}.author` });
      }
      if (!comment.date) {
        result.errors.push({ code: "comment.date", message: "Ошибка: comment без date", path: `${commentPath}.date` });
      }
      if (!comment.text) {
        result.errors.push({ code: "comment.text", message: "Ошибка: comment без text", path: `${commentPath}.text` });
      }
    });

    issue.viewpoints.forEach((viewpoint, viewpointIndex) => {
      const viewpointPath = `${issuePath}.viewpoints[${viewpointIndex}]`;
      if (!viewpoint.guid) {
        result.errors.push({ code: "viewpoint.guid", message: "Ошибка: viewpoint без GUID", path: `${viewpointPath}.guid` });
      }
      if (!viewpoint.perspectiveCamera && !viewpoint.orthogonalCamera) {
        result.warnings.push({ code: "viewpoint.camera", message: "Предупреждение: viewpoint без camera", path: viewpointPath });
      }
      if (viewpoint.components.selection.length === 0 && viewpoint.components.visibility.exceptions.length === 0) {
        result.warnings.push({ code: "viewpoint.components", message: "Предупреждение: нет components", path: `${viewpointPath}.components` });
      }
      if (!viewpoint.snapshot) {
        result.warnings.push({ code: "viewpoint.snapshot", message: "Предупреждение: нет snapshot", path: `${viewpointPath}.snapshot` });
      }
    });
  });

  return result;
}

export function hasBlockingErrors(result: InternalBcfValidationResult): boolean {
  return result.errors.length > 0;
}
