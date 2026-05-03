import type { BcfVersion } from "../domain/model";
import { serializeBcfZip } from "../bcf/serializer";
import { hasBlockingErrors, validateProject } from "../bcf/validator";
import { issueStore } from "../application/issue-store";
import { updateStatusBar } from "../application/status-service";
import { saveBcfZipBytes } from "../topomatic/file-dialog-adapter";
import type { TopomaticContext } from "../topomatic/albatros-types";
import { getErrorMessage } from "../utils/errors";

const EXPORT_VERSIONS: BcfVersion[] = ["3.0", "2.1", "2.0"];

export async function export_bcf(ctx: TopomaticContext): Promise<void> {
  const status = ctx.setStatusBarMessage("Экспорт BCF...");
  const output = ctx.createOutputChannel("BCF Manager");

  try {
    const version = await ctx.showQuickPick(EXPORT_VERSIONS, { title: "Версия BCFZIP", placeHolder: "Выберите версию экспорта" }) as BcfVersion | undefined;
    if (!version) {
      ctx.showMessage("Экспорт отменён", "warning");
      return;
    }

    const project = issueStore.getProject();
    const validation = validateProject(project);
    validation.errors.forEach((message) => output.appendLine(`${message.path}: ${message.message}`));
    validation.warnings.forEach((message) => output.appendLine(`${message.path}: ${message.message}`));

    if (hasBlockingErrors(validation)) {
      output.show?.();
      ctx.showMessage("Экспорт BCF заблокирован: проект содержит ошибки", "error");
      return;
    }

    if (validation.warnings.length > 0) {
      const answer = await ctx.showQuickPick(["Экспортировать", "Отмена"], {
        title: "Есть предупреждения",
        placeHolder: "Экспортировать BCF с предупреждениями?"
      });
      if (answer !== "Экспортировать") {
        ctx.showMessage("Экспорт отменён", "warning");
        return;
      }
    }

    const bytes = await serializeBcfZip(project, version);
    await saveBcfZipBytes(ctx, bytes);
    issueStore.replaceProject(project, false);
    updateStatusBar(ctx);
    ctx.showMessage(`BCFZIP ${version} экспортирован`, "info");
  } catch (error) {
    const message = getErrorMessage(error);
    output.appendLine(message);
    output.show?.();
    ctx.showMessage(message, "error");
  } finally {
    status.dispose();
  }
}
