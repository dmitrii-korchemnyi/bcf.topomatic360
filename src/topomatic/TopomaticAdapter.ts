import { ModelBridge, UiBridge, UiController } from "../domain/contracts";
import { ExportOptions, IssueTopic } from "../domain/model";
import { mountIssueEditorDialog } from "../ui/issueEditorDialog";
import { mountIssueManagerDialog } from "../ui/issueManagerDialog";
import { treeBus } from "../utils/treeBus";

type QuickItem<T extends string> = { label: string; value: T; description?: string };

export class TopomaticAdapter implements UiBridge, ModelBridge {
  private readonly channel: OutputChannel;

  constructor(private readonly ctx: Context, private readonly settings?: ApplicationSettings) {
    this.channel = this.ctx.createOutputChannel("BCF Manager");
  }

  async info(message: string): Promise<void> {
    this.channel.appendLine(message);
    this.ctx.showMessage(message, "info");
  }

  async warn(message: string): Promise<void> {
    this.channel.appendLine(`[WARN] ${message}`);
    this.ctx.showMessage(message, "warning");
  }

  async error(message: string): Promise<void> {
    this.channel.appendLine(`[ERROR] ${message}`);
    this.channel.show(false);
    this.ctx.showMessage(message, "error");
  }

  async notifyDiagnostics(lines: string[], kind: "info" | "warning" | "error" = "info"): Promise<void> {
    this.channel.clear();
    lines.forEach(line => this.channel.appendLine(line));
    this.channel.show(false);
    if (lines[0]) await this.ctx.showMessage(lines[0], kind === "warning" ? "warning" : kind === "error" ? "error" : "info");
  }

  async promptVersion(kind: "import" | "export"): Promise<ExportOptions | undefined> {
    const items: QuickItem<ExportOptions["version"]>[] = [
      { label: "BCF 2.0", value: "2.0", description: `${kind === "export" ? "Экспорт" : "Импорт"} наиболее совместимого варианта` },
      { label: "BCF 2.1", value: "2.1", description: "Стандартный production-вариант" },
      { label: "BCF 3.0", value: "3.0", description: "Современный cloud-first вариант" }
    ];
    const picked = await this.ctx.showQuickPick(items.map(i => ({ label: i.label, description: i.description })), { placeHolder: `Выберите версию BCF для ${kind === "export" ? "экспорта" : "импорта"}` });
    if (!picked) return undefined;
    const found = items.find(i => i.label === picked.label);
    return found ? { version: found.value, container: ".bcfzip" } : undefined;
  }

  async promptComment(initial = ""): Promise<string | undefined> {
    return this.ctx.showInputBox({ prompt: "Комментарий", value: initial, placeHolder: "Введите комментарий" });
  }

  async openImportFile(): Promise<Uint8Array | undefined> {
    const ws = await this.ctx.openDialog({
      filters: [{ name: "BCF", extensions: ["bcfzip", "bcf"] }],
      message: "Выберите BCF/BCFZIP файл"
    });
    return ws?.root?.get();
  }

  async saveArchive(defaultName: string): Promise<Workspace | undefined> {
    return this.ctx.saveDialog({
      folder: false,
      suggestedName: defaultName,
      filters: [{ name: "BCF", extensions: ["bcfzip", "bcf"] }],
      message: "Сохранить BCF пакет"
    });
  }

  async openManagerWindow(service: UiController): Promise<void> {
    await this.ctx.showDefinedDialog({
      title: "BCF Manager",
      modal: false,
      hideButtons: true,
      mount: (el) => { void mountIssueManagerDialog(el, service); }
    });
  }

  async openEditorWindow(service: UiController, topicGuid?: string): Promise<void> {
    await this.ctx.showDefinedDialog({
      title: topicGuid ? "Редактирование замечания" : "Создание замечания",
      modal: false,
      hideButtons: true,
      mount: (el) => { void mountIssueEditorDialog(el, service, topicGuid); }
    });
  }

  async getCurrentSelection(): Promise<unknown[]> {
    const cadview = this.ctx.cadview;
    if (!cadview) return [];
    return Array.from(cadview.layer.selectedObjects());
  }

  async getCurrentSnapshotBase64(): Promise<string | undefined> {
    return undefined;
  }

  async getCurrentCamera(): Promise<unknown | undefined> {
    return this.ctx.cadview?.camera;
  }

  async focusTopic(topic: IssueTopic): Promise<void> {
    const cadview = this.ctx.cadview;
    if (!cadview) {
      await this.warn("Откройте модель или чертёж, чтобы перейти к замечанию.");
      return;
    }
    const refs = topic.viewpoints[0]?.components ?? [];
    if (refs.length) {
      const idSet = new Set(refs.map(r => [r.elementId, r.ifcGuid, r.elementName].filter(Boolean).map(String)).flat());
      cadview.layer.selectObjects((obj: any) => {
        const values = [obj?.id, obj?.elementId, obj?.uid, obj?.ifcGuid, obj?.GlobalId, obj?.name, obj?.title].filter(Boolean).map(String);
        return values.some(v => idSet.has(v));
      }, true);
    }
    treeBus.emit();
    this.ctx.setStatusBarMessage(`Открыто замечание: ${topic.number}. ${topic.title}`, 2500);
    this.channel.appendLine(`Focus topic: ${topic.number}. ${topic.title}`);
  }
}
