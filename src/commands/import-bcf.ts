import { parseBcfZip } from "../bcf/parser";
import { validateProject } from "../bcf/validator";
import { issueStore } from "../application/issue-store";
import { updateStatusBar } from "../application/status-service";
import { openBcfZipBytes } from "../topomatic/file-dialog-adapter";
import type { TopomaticContext } from "../topomatic/albatros-types";
import { getErrorMessage } from "../utils/errors";

export async function import_bcf(ctx: TopomaticContext): Promise<void> {
  const status = ctx.setStatusBarMessage("Импорт BCF...");
  const output = ctx.createOutputChannel("BCF Manager");

  try {
    const bytes = await openBcfZipBytes(ctx);
    const project = await parseBcfZip(bytes);
    const validation = validateProject(project);

    validation.errors.forEach((message) => output.appendLine(`${message.path}: ${message.message}`));
    validation.warnings.forEach((message) => output.appendLine(`${message.path}: ${message.message}`));

    if (validation.errors.length > 0) {
      output.show?.();
      ctx.showMessage("Импорт BCF заблокирован: файл содержит ошибки", "error");
      return;
    }

    issueStore.replaceProject(project, false);
    updateStatusBar(ctx);
    ctx.manager?.broadcast?.("bcf:changed", { source: "import" });
    ctx.showMessage(`Импортировано замечаний: ${project.issues.length}`, validation.warnings.length > 0 ? "warning" : "info");
  } catch (error) {
    const message = getErrorMessage(error);
    output.appendLine(message);
    output.show?.();
    ctx.showMessage(message, "error");
  } finally {
    status.dispose();
  }
}
