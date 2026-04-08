import { ActiveTreeNode, BrowserActions, ModelBridge, QuickPickItem, SelectionComponent, UiBridge } from "../domain/contracts";
import { BcfVersion, IssueProject, IssueTopic, TopicEditorInput } from "../domain/model";
import { mountIssueBrowserDialog } from "../ui/issueBrowserDialog";
import { mountIssueEditorDialog } from "../ui/issueEditorDialog";

export class TopomaticAdapter implements UiBridge, ModelBridge {
  private readonly channel: OutputChannel;

  constructor(private readonly ctx: Context) {
    this.channel = ctx.createOutputChannel("BCF");
  }

  async info(message: string): Promise<void> {
    this.channel.appendLine(message);
    await this.ctx.showMessage(message, "info");
  }

  async warn(message: string): Promise<void> {
    this.channel.appendLine(`[warn] ${message}`);
    await this.ctx.showMessage(message, "warning");
  }

  async error(message: string): Promise<void> {
    this.channel.appendLine(`[error] ${message}`);
    this.channel.show(true);
    await this.ctx.showMessage(message, "error");
  }

  async quickPick<T extends QuickPickItem>(items: T[], placeholder: string): Promise<T | undefined> {
    if (items.length === 0) return undefined;
    const picked = await this.ctx.showQuickPick(
      items.map((item) => ({ label: item.label, description: item.description, detail: item.detail, key: item.key } as any)),
      { placeHolder: placeholder }
    );
    if (!picked) return undefined;
    return items.find((item) => item.key === (picked as any).key || item.label === (picked as any).label);
  }

  async inputBox(prompt: string, value = ""): Promise<string | undefined> {
    const result = await this.ctx.showInputBox({ prompt, value });
    return result || undefined;
  }

  async pickOpenFile(filenameExtension: string): Promise<Uint8Array | undefined> {
    const workspace = await this.ctx.openDialog({
      filters: [{ name: filenameExtension.toUpperCase(), extensions: [filenameExtension] }],
      message: "Выберите BCFZIP-файл"
    });
    return workspace?.root?.get();
  }

  async pickSaveWorkspace(defaultName: string): Promise<Workspace | undefined> {
    const workspace = await this.ctx.saveDialog({
      folder: false,
      suggestedName: defaultName,
      filters: [{ name: "BCFZIP", extensions: ["bcfzip"] }],
      message: "Сохранение BCFZIP"
    });
    return workspace || undefined;
  }

  async saveBinary(workspace: Workspace, data: Uint8Array): Promise<void> {
    await workspace.root.put(data);
    await workspace.flush();
  }

  async chooseExportVersion(defaultVersion: BcfVersion): Promise<BcfVersion | undefined> {
    const items: Array<QuickPickItem & { value: BcfVersion }> = [
      { key: "2.1", value: "2.1", label: "BCF 2.1", description: "Максимальная совместимость с Navisworks и BIMcollab" },
      { key: "3.0", value: "3.0", label: "BCF 3.0", description: "Новый формат buildingSMART" },
      { key: "3.1", value: "3.1", label: "BCF 3.1", description: "Совместимый режим 3.x" }
    ];
    const picked = await this.quickPick(items, `Выберите версию экспорта (по умолчанию ${defaultVersion})`);
    return (picked as any)?.value;
  }

  async showIssueBrowser(project: IssueProject, actions: BrowserActions): Promise<void> {
    await this.ctx.showDefinedDialog({
      title: "Замечания BCF",
      modal: true,
      hideButtons: true,
      mount: (el) => mountIssueBrowserDialog(el, project, actions)
    });
  }

  async showIssueEditor(initial: TopicEditorInput, options: { mode: "create" | "edit"; snapshotBase64?: string; commentsHint?: string }): Promise<TopicEditorInput | undefined> {
    return new Promise<TopicEditorInput | undefined>((resolve) => {
      let settled = false;
      this.ctx.showDefinedDialog({
        title: options.mode === "create" ? "Создание замечания" : "Редактирование замечания",
        modal: true,
        hideButtons: true,
        mount: (el) => mountIssueEditorDialog(el, initial, {
          ...options,
          onSave: async (result) => {
            settled = true;
            resolve(result);
            await this.ctx.showMessage("Изменения сохранены. Закройте окно редактора.", "info");
          },
          onCancel: () => {
            settled = true;
            resolve(undefined);
          }
        })
      }).then(() => {
        if (!settled) resolve(undefined);
      });
    });
  }

  async showTopicDetails(topic: IssueTopic): Promise<void> {
    const text = [
      `${topic.number}. ${topic.title}`,
      `Статус: ${topic.status}`,
      `Приоритет: ${topic.priority}`,
      `Тип: ${topic.type}`,
      `Назначено: ${topic.assignedTo || "Unassigned"}`,
      `Описание: ${topic.description || "—"}`,
      topic.comments.length > 0
        ? `Последний комментарий: ${topic.comments[topic.comments.length - 1]?.author}: ${topic.comments[topic.comments.length - 1]?.message}`
        : "Комментариев пока нет"
    ];
    await this.ctx.showMessage(text, "info", { title: "Карточка замечания" });
  }

  async confirm(title: string, message: string): Promise<boolean> {
    const picked = await this.ctx.showQuickPick([
      { label: "Да", description: title, detail: message },
      { label: "Нет", description: title, detail: message }
    ] as any, { placeHolder: message });
    return (picked as any)?.label === "Да";
  }

  async refreshViews(): Promise<void> {
    (this.ctx.manager as any)?.broadcast?.("bcf:refresh", { source: "bcf-plugin" });
  }

  async getCurrentSelection(): Promise<SelectionComponent[]> {
    const cadview = this.ctx.cadview;
    if (!cadview?.layer) return [];
    const result: SelectionComponent[] = [];
    for (const item of cadview.layer.selectedObjects()) {
      const source = item as Record<string, unknown>;
      const layer = source.layer as { name?: string } | undefined;
      result.push({
        id: asString(source.id) ?? asString(source.$id) ?? asString(source.guid),
        ifcGuid: asString(source.ifcGuid) ?? asString(source.globalId),
        modelRef: asString(source.modelRef) ?? asString(source.modelName),
        layerName: layer?.name ?? asString(source.layerName),
        elementName: asString(source.name),
        elementType: asString(source.type),
        selected: true,
        visible: true,
        color: asString(source.color)
      });
    }
    return result;
  }

  async getCurrentSnapshotBase64(): Promise<string | undefined> {
    const snapshot = (this.ctx as Record<string, unknown>).captureSnapshot;
    if (typeof snapshot === "function") {
      const result = await (snapshot as () => Promise<string | undefined>)();
      return result || undefined;
    }
    return undefined;
  }

  async focusTopic(topic: IssueTopic): Promise<void> {
    const cadview = this.ctx.cadview;
    if (cadview?.layer) {
      try {
        cadview.layer.clearSelected();
        const refs = collectRefs(topic);
        if (refs.length > 0) {
          cadview.layer.selectObjects((obj: any) => {
            const candidates = [obj?.ifcGuid, obj?.globalId, obj?.id, obj?.$id, obj?.guid, obj?.name];
            return candidates.some((value) => value != null && refs.includes(String(value)));
          }, true);
          cadview.layer.regenCadView(cadview);
        }
      } catch (error) {
        this.channel.appendLine(`[warn] Не удалось выделить объекты замечания: ${String(error)}`);
      }
    }
    const title = `Открыто замечание: ${topic.number}. ${topic.title}`;
    this.channel.appendLine(title);
    this.ctx.setStatusBarMessage(title, 2500);
  }

  getActiveTreeNode(): ActiveTreeNode | undefined {
    const treeview = (this.ctx as any).treeview as TreeView<TreeItem> | undefined;
    const active = treeview?.active;
    if (!active) return undefined;
    return {
      id: active.id,
      contextValue: active.contextValue,
      label: typeof active.label === "string" ? active.label : active.label?.label
    };
  }

  debugContextSnapshot(): Record<string, unknown> {
    const treeview = (this.ctx as any).treeview as TreeView<TreeItem> | undefined;
    return {
      hasApp: Boolean(this.ctx.app),
      hasCadView: Boolean(this.ctx.cadview),
      hasWindow: Boolean((this.ctx as any).window),
      activeTreeNode: this.getActiveTreeNode() ?? null,
      treeSelection: treeview?.selection?.map((item) => item.id) ?? [],
      commandKeys: Object.keys(this.ctx as Record<string, unknown>).slice(0, 30)
    };
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function collectRefs(topic: IssueTopic): string[] {
  const refs = new Set<string>();
  for (const viewpoint of topic.viewpoints) {
    for (const component of viewpoint.components) {
      for (const value of [component.ifcGuid, component.elementId, component.elementName]) {
        if (value) refs.add(String(value));
      }
    }
  }
  return [...refs];
}

