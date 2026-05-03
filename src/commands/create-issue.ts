import { createIssue } from "../application/issue-service";
import { issueStore } from "../application/issue-store";
import { updateStatusBar } from "../application/status-service";
import { readSelectedComponents } from "../topomatic/selection-adapter";
import { captureSnapshot, enrichViewpointFromCadView } from "../topomatic/viewpoint-adapter";
import type { TopomaticContext } from "../topomatic/albatros-types";
import { getErrorMessage } from "../utils/errors";

export async function create_bcf_issue(ctx: TopomaticContext): Promise<void> {
  if (!ctx.app) {
    ctx.showMessage("Нет активного проекта", "warning");
    return;
  }

  if (!ctx.cadview) {
    ctx.showMessage("Откройте чертёж или модель", "warning");
    return;
  }

  const output = ctx.createOutputChannel("BCF Manager");

  try {
    const title = await ctx.showInputBox({ title: "Новое BCF-замечание", prompt: "Title", placeHolder: "Краткое название замечания" });
    if (!title?.trim()) {
      ctx.showMessage("Создание замечания отменено", "warning");
      return;
    }

    const description = await ctx.showInputBox({ title: "Описание", prompt: "Description", placeHolder: "Описание замечания" });
    const author = await ctx.showInputBox({ title: "Автор", prompt: "Creation author", value: "Topomatic 360 User" });
    const selection = readSelectedComponents(ctx.cadview);
    const snapshotResult = await captureSnapshot(ctx.cadview);

    let issue = createIssue({
      title,
      description,
      author: author?.trim() || "Topomatic 360 User",
      components: selection.components,
      snapshot: snapshotResult.snapshot
    });

    const enriched = enrichViewpointFromCadView(issue.viewpoints[0], ctx.cadview);
    issue = { ...issue, viewpoints: [enriched.viewpoint] };
    [...selection.warnings, ...snapshotResult.warnings, ...enriched.warnings].forEach((warning) => output.appendLine(warning));

    issueStore.addIssue(issue);
    updateStatusBar(ctx);
    ctx.manager?.broadcast?.("bcf:changed", { source: "create", issueGuid: issue.guid });
    ctx.showMessage(`Создано замечание: ${issue.title}`, output ? "info" : "info");
  } catch (error) {
    const message = getErrorMessage(error);
    output.appendLine(message);
    output.show?.();
    ctx.showMessage(message, "error");
  }
}
