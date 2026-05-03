import type { TopomaticContext } from "../topomatic/albatros-types";
import { issueStore } from "./issue-store";
import { isClosedIssue } from "./issue-service";

export function updateStatusBar(ctx: TopomaticContext): void {
  const project = issueStore.getProject();
  const closed = project.issues.filter(isClosedIssue).length;
  const open = project.issues.length - closed;
  const dirty = issueStore.isDirty() ? " | dirty" : "";
  ctx.setStatusBarMessage(`BCF: ${project.issues.length} | ${open} открытых | ${closed} закрытых${dirty}`);
}
