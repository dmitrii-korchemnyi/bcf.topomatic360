import {
  ActiveTreeNode,
  ArchiveReader,
  ArchiveWriter,
  BrowserActions,
  ModelBridge,
  QuickPickItem,
  SelectionComponent,
  TopicStore,
  UiBridge
} from "../domain/contracts";
import {
  BcfVersion,
  CommentItem,
  ComponentsMode,
  IssueProject,
  IssueTopic,
  TopicEditorInput,
  Viewpoint
} from "../domain/model";

export class BcfService {
  constructor(
    private readonly store: TopicStore,
    private readonly reader: ArchiveReader,
    private readonly writer: ArchiveWriter,
    private readonly ui: UiBridge,
    private readonly model: ModelBridge
  ) {}

  async openBrowser(selectedTopicGuid?: string): Promise<void> {
    const project = await this.store.load();
    await this.ui.showIssueBrowser(project, this.createBrowserActions());
    if (selectedTopicGuid) {
      const refreshed = await this.store.load();
      const topic = refreshed.topics.find((item) => item.guid === selectedTopicGuid);
      if (topic) {
        await this.model.focusTopic(topic);
      }
    }
  }

  async importArchive(): Promise<void> {
    try {
      const buffer = await this.ui.pickOpenFile("bcfzip");
      if (!buffer) return;
      const project = await this.reader.read(buffer);
      await this.store.save(project);
      await this.ui.refreshViews();
      await this.ui.info(`Импортировано замечаний: ${project.topics.length}. Версия BCF: ${project.version}`);
    } catch (error) {
      await this.ui.error(this.messageOf(error, "Не удалось импортировать BCFZIP."));
    }
  }

  async exportArchive(version?: BcfVersion): Promise<void> {
    try {
      const project = await this.store.load();
      const exportVersion = version ?? await this.ui.chooseExportVersion(project.version);
      if (!exportVersion) return;
      const workspace = await this.ui.pickSaveWorkspace(`${slugify(project.name)}_${exportVersion}.bcfzip`);
      if (!workspace) return;
      const data = await this.writer.write(project, exportVersion);
      await this.ui.saveBinary(workspace, data);
      await this.ui.info(`BCFZIP сохранён. Версия: ${exportVersion}`);
    } catch (error) {
      await this.ui.error(this.messageOf(error, "Не удалось экспортировать BCFZIP."));
    }
  }

  async createTopic(author = "Topomatic User"): Promise<void> {
    await this.openEditor(undefined, author);
  }

  async editTopicFromContext(author = "Topomatic User"): Promise<void> {
    const topic = await this.getTopicFromActiveContext();
    if (!topic) {
      await this.ui.warn("Не выбрано замечание BCF.");
      return;
    }
    await this.openEditor(topic.guid, author);
  }

  async addCommentFromContext(author = "Topomatic User"): Promise<void> {
    const topic = await this.getTopicFromActiveContext();
    if (!topic) {
      await this.ui.warn("Не выбрано замечание для комментирования.");
      return;
    }
    await this.addComment(topic.guid, author);
  }

  async openTopicFromContext(): Promise<void> {
    const topic = await this.getTopicFromActiveContext();
    if (!topic) {
      await this.ui.warn("Не выбрано замечание BCF.");
      return;
    }
    await this.openTopic(topic.guid);
  }

  async deleteTopicFromContext(): Promise<void> {
    const topic = await this.getTopicFromActiveContext();
    if (!topic) {
      await this.ui.warn("Не выбрано замечание для удаления.");
      return;
    }
    await this.deleteTopic(topic.guid);
  }

  async resolveTopicFromContext(): Promise<void> {
    const topic = await this.getTopicFromActiveContext();
    if (!topic) return;
    await this.setStatus(topic.guid, "Устранено");
  }

  async closeTopicFromContext(): Promise<void> {
    const topic = await this.getTopicFromActiveContext();
    if (!topic) return;
    await this.setStatus(topic.guid, "Закрыто");
  }

  async reopenTopicFromContext(): Promise<void> {
    const topic = await this.getTopicFromActiveContext();
    if (!topic) return;
    await this.setStatus(topic.guid, "Активно");
  }

  async openQuickList(): Promise<void> {
    const project = await this.store.load();
    if (project.topics.length === 0) {
      await this.ui.warn("Замечаний пока нет.");
      return;
    }

    const picked = await this.ui.quickPick(
      project.topics.map((topic) => this.toQuickPickItem(topic)),
      "Выберите замечание"
    );
    if (!picked) return;
    await this.openTopic(picked.key);
  }

  async openTopic(topicGuid: string): Promise<void> {
    const topic = await this.requireTopic(topicGuid);
    if (!topic) return;
    await this.model.focusTopic(topic);
    await this.ui.showTopicDetails(topic);
  }

  async addComment(topicGuid: string, author = "Topomatic User"): Promise<void> {
    const topic = await this.requireTopic(topicGuid);
    if (!topic) return;
    const message = await this.ui.inputBox(`Комментарий к замечанию ${topic.number}`);
    if (!message) return;

    const project = await this.store.load();
    const mutable = project.topics.find((item) => item.guid === topicGuid);
    if (!mutable) return;
    const date = new Date().toISOString();
    mutable.comments.push({ guid: crypto.randomUUID(), author, date, message });
    mutable.modifiedAuthor = author;
    mutable.modifiedDate = date;
    await this.store.save(project);
    await this.ui.refreshViews();
    await this.ui.info("Комментарий добавлен.");
  }

  async setStatus(topicGuid: string, status: IssueTopic["status"]): Promise<void> {
    const project = await this.store.load();
    const topic = project.topics.find((item) => item.guid === topicGuid);
    if (!topic) return;
    if (topic.status === status) return;

    topic.status = status;
    topic.modifiedAuthor = "Topomatic User";
    topic.modifiedDate = new Date().toISOString();
    topic.comments.push(this.statusComment(status, topic.modifiedAuthor, topic.modifiedDate));
    await this.store.save(project);
    await this.ui.refreshViews();
    await this.ui.info(`Статус замечания изменён: ${status}.`);
  }

  async deleteTopic(topicGuid: string): Promise<void> {
    const topic = await this.requireTopic(topicGuid);
    if (!topic) return;
    const confirmed = await this.ui.confirm("Удаление замечания", `Удалить замечание «${topic.number}. ${topic.title}»?`);
    if (!confirmed) return;

    const project = await this.store.load();
    project.topics = project.topics.filter((item) => item.guid !== topicGuid);
    await this.store.save(project);
    await this.ui.refreshViews();
    await this.ui.info("Замечание удалено.");
  }

  async refresh(): Promise<void> {
    await this.ui.refreshViews();
  }

  async debugContext(): Promise<void> {
    await this.ui.info(JSON.stringify(this.model.debugContextSnapshot(), null, 2));
  }

  async getProject(): Promise<IssueProject> {
    return this.store.load();
  }

  private async openEditor(topicGuid: string | undefined, author: string): Promise<void> {
    const project = await this.store.load();
    const topic = topicGuid ? project.topics.find((item) => item.guid === topicGuid) : undefined;
    const snapshotBase64 = await this.model.getCurrentSnapshotBase64();

    const initial = topic ? toEditorInput(topic) : this.defaultEditorInput(project);
    const result = await this.ui.showIssueEditor(initial, {
      mode: topic ? "edit" : "create",
      snapshotBase64,
      commentsHint: "Формулируйте заголовок кратко и явно. Подробности и изменения состояния фиксируйте в комментариях."
    });
    if (!result) return;

    const nextProject = await this.store.load();
    if (topic) {
      const mutable = nextProject.topics.find((item) => item.guid === topic.guid);
      if (!mutable) return;
      applyEditorInput(mutable, result);
      mutable.modifiedAuthor = author;
      mutable.modifiedDate = new Date().toISOString();
    } else {
      const selection = await this.model.getCurrentSelection();
      const created = createTopicFromEditor(nextProject, result, author, snapshotBase64, selection);
      nextProject.topics.unshift(created);
    }

    await this.store.save(nextProject);
    await this.ui.refreshViews();
    await this.ui.info(topic ? "Замечание обновлено." : "Замечание создано.");
  }

  private async requireTopic(topicGuid: string): Promise<IssueTopic | undefined> {
    const project = await this.store.load();
    const topic = project.topics.find((item) => item.guid === topicGuid);
    if (!topic) {
      await this.ui.warn("Замечание не найдено.");
      return undefined;
    }
    return topic;
  }

  private async getTopicFromActiveContext(): Promise<IssueTopic | undefined> {
    const node = this.model.getActiveTreeNode();
    const topicGuid = extractTopicGuid(node);
    return topicGuid ? this.requireTopic(topicGuid) : undefined;
  }

  private defaultEditorInput(project: IssueProject): TopicEditorInput {
    return {
      number: nextNumber(project.topics),
      title: "",
      description: "",
      status: "Активно",
      priority: "Не задан",
      type: "Замечание",
      labels: [],
      assignedTo: "Unassigned",
      area: "",
      milestone: "",
      deadline: ""
    };
  }

  private createBrowserActions(): BrowserActions {
    return {
      selectTopic: async (topicGuid) => this.openTopic(topicGuid),
      openTopic: async (topicGuid) => this.openTopic(topicGuid),
      createTopic: async () => this.createTopic(),
      editTopic: async (topicGuid) => this.openEditor(topicGuid, "Topomatic User"),
      deleteTopic: async (topicGuid) => this.deleteTopic(topicGuid),
      addComment: async (topicGuid) => this.addComment(topicGuid, "Topomatic User"),
      setStatus: async (topicGuid, status) => this.setStatus(topicGuid, status),
      importArchive: async () => this.importArchive(),
      exportArchive: async () => this.exportArchive(),
      refresh: async () => this.refresh()
    };
  }

  private toQuickPickItem(topic: IssueTopic): QuickPickItem {
    return {
      key: topic.guid,
      label: `${topic.number}. ${topic.title}`,
      description: `${topic.status} · ${topic.priority}`,
      detail: `Комментарии: ${topic.comments.length}`
    };
  }

  private statusComment(status: IssueTopic["status"], author: string, date: string): CommentItem {
    const message = status === "Устранено"
      ? "Статус изменён на «Устранено». Требуется проверка решения."
      : status === "Закрыто"
        ? "Статус изменён на «Закрыто». Решение подтверждено."
        : "Замечание переоткрыто и снова требует обработки.";
    return { guid: crypto.randomUUID(), author, date, message };
  }

  private messageOf(error: unknown, fallback: string): string {
    return error instanceof Error ? `${fallback} ${error.message}` : fallback;
  }
}

function extractTopicGuid(node: ActiveTreeNode | undefined): string | undefined {
  if (!node) return undefined;
  const parts = node.id.split(":");
  return parts.length >= 2 ? parts[1] : undefined;
}

function nextNumber(topics: IssueTopic[]): number {
  return topics.reduce((max, item) => Math.max(max, item.number), 0) + 1;
}

function toEditorInput(topic: IssueTopic): TopicEditorInput {
  return {
    guid: topic.guid,
    number: topic.number,
    title: topic.title,
    description: topic.description,
    status: topic.status,
    priority: topic.priority,
    type: topic.type,
    labels: [...topic.labels],
    assignedTo: topic.assignedTo,
    area: topic.area,
    milestone: topic.milestone,
    deadline: topic.deadline
  };
}

function applyEditorInput(topic: IssueTopic, input: TopicEditorInput): void {
  topic.title = input.title.trim();
  topic.description = input.description.trim();
  topic.status = input.status;
  topic.priority = input.priority;
  topic.type = input.type;
  topic.labels = input.labels;
  topic.assignedTo = blankToUndefined(input.assignedTo);
  topic.area = blankToUndefined(input.area);
  topic.milestone = blankToUndefined(input.milestone);
  topic.deadline = blankToUndefined(input.deadline);
}

function createTopicFromEditor(
  project: IssueProject,
  input: TopicEditorInput,
  author: string,
  snapshotBase64: string | undefined,
  selection: SelectionComponent[]
): IssueTopic {
  const now = new Date().toISOString();
  const viewpoint: Viewpoint = {
    guid: crypto.randomUUID(),
    title: "Основной вид",
    snapshotBase64,
    snapshotFileName: snapshotBase64 ? `${crypto.randomUUID()}.png` : undefined,
    componentsMode: inferComponentsMode(selection),
    components: selection.map((item, index) => ({
      elementId: String(item.id ?? index + 1),
      ifcGuid: item.ifcGuid,
      modelRef: item.modelRef,
      layerName: item.layerName,
      elementName: item.elementName,
      elementType: item.elementType,
      selected: true,
      visible: item.visible ?? true,
      color: item.color
    }))
  };

  return {
    guid: crypto.randomUUID(),
    number: input.number ?? nextNumber(project.topics),
    title: input.title.trim(),
    description: input.description.trim(),
    status: input.status,
    priority: input.priority,
    type: input.type,
    labels: input.labels,
    assignedTo: blankToUndefined(input.assignedTo),
    area: blankToUndefined(input.area),
    milestone: blankToUndefined(input.milestone),
    deadline: blankToUndefined(input.deadline),
    creationAuthor: author,
    creationDate: now,
    comments: [],
    viewpoints: [viewpoint]
  };
}

function inferComponentsMode(selection: SelectionComponent[]): ComponentsMode {
  return selection.length > 0 ? "Выбранные" : "Видимые";
}

function blankToUndefined(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

function slugify(value: string): string {
  return value.replace(/[^a-zA-Z0-9а-яА-Я_-]+/g, "_").replace(/_+/g, "_");
}
