import { ArchiveReader, ArchiveWriter, ModelBridge, TopicStore, UiBridge, UiController, Validator } from "../domain/contracts";
import { DEFAULT_TOPIC_DRAFT, ExportOptions, IssueProject, IssueTopic, TopicDraft, Viewpoint } from "../domain/model";
import { isoNow } from "../utils/dates";
import { guid } from "../utils/ids";
import { mapCamera, mapSelectionToComponent } from "../utils/selection";
import { treeBus } from "../utils/treeBus";

export class BcfService implements UiController {
  private selectedTopicGuid?: string;

  constructor(
    private readonly store: TopicStore,
    private readonly reader: ArchiveReader,
    private readonly writer: ArchiveWriter,
    private readonly validator: Validator,
    private readonly ui: UiBridge,
    private readonly model: ModelBridge
  ) {}

  async getProject(): Promise<IssueProject> {
    return this.store.load();
  }

  async getSelectedTopicGuid(): Promise<string | undefined> {
    return this.selectedTopicGuid;
  }

  async setSelectedTopic(topicGuid: string | undefined): Promise<void> {
    this.selectedTopicGuid = topicGuid;
    treeBus.emit();
  }

  async openManager(): Promise<void> {
    await this.ui.openManagerWindow(this);
  }

  async openEditor(topicGuid?: string): Promise<void> {
    await this.ui.openEditorWindow(this, topicGuid);
  }

  async importArchive(): Promise<void> {
    const buffer = await this.ui.openImportFile();
    if (!buffer) return;
    const result = await this.reader.read(buffer);
    this.selectedTopicGuid = result.project.topics[0]?.guid;
    await this.store.save(result.project);
    const diagnostics = [`Импорт завершён. Версия BCF: ${result.detectedVersion}`, `Замечаний: ${result.project.topics.length}`].concat(result.warnings);
    await this.ui.notifyDiagnostics(diagnostics, result.warnings.length ? "warning" : "info");
    treeBus.emit();
  }

  async exportArchive(): Promise<void> {
    const project = await this.store.load();
    const options = await this.ui.promptVersion("export");
    if (!options) return;
    const validation = this.validator.validate(project, options);
    if (!validation.valid) {
      await this.ui.notifyDiagnostics(validation.messages.map(m => `${m.level.toUpperCase()}: ${m.message}`), "error");
      return;
    }
    if (validation.messages.length) {
      await this.ui.notifyDiagnostics(validation.messages.map(m => `${m.level.toUpperCase()}: ${m.message}`), "warning");
    }
    const ws = await this.ui.saveArchive(this.suggestArchiveName(project, options));
    if (!ws) return;
    const data = await this.writer.write(project, options);
    await ws.root.put(data);
    await ws.flush();
    await this.ui.info(`Экспортирован пакет ${options.container} (BCF ${options.version})`);
  }

  async focusTopic(topicGuid: string): Promise<void> {
    const project = await this.store.load();
    const topic = project.topics.find(t => t.guid === topicGuid);
    if (!topic) return;
    this.selectedTopicGuid = topicGuid;
    await this.model.focusTopic(topic);
    treeBus.emit();
  }

  async createIssueFromSelection(author = "Пользователь Topomatic"): Promise<void> {
    const project = await this.store.load();
    const selection = await this.model.getCurrentSelection();
    const snapshotBase64 = await this.model.getCurrentSnapshotBase64();
    const camera = mapCamera(await this.model.getCurrentCamera());
    const viewpoint: Viewpoint = {
      guid: guid(),
      title: "Основной вид",
      snapshotBase64,
      snapshotFileName: snapshotBase64 ? "snapshot.png" : undefined,
      camera,
      componentsMode: "Выбранные",
      components: selection.map((x, i) => mapSelectionToComponent(x, i))
    };

    const topic: IssueTopic = {
      guid: guid(),
      number: this.nextNumber(project.topics),
      title: `Замечание ${this.nextNumber(project.topics)}`,
      description: "",
      status: "Новая",
      priority: "Обычный",
      type: "Замечание",
      labels: [],
      assignedTo: "",
      area: "",
      milestone: "",
      deadline: "",
      creationAuthor: author,
      creationDate: isoNow(),
      comments: [],
      viewpoints: [viewpoint]
    };
    project.topics.unshift(topic);
    this.selectedTopicGuid = topic.guid;
    await this.store.save(project);
    treeBus.emit();
    await this.openEditor(topic.guid);
  }

  async saveDraft(topicGuid: string | undefined, draft: TopicDraft, author = "Пользователь Topomatic"): Promise<void> {
    const project = await this.store.load();
    let topic = topicGuid ? project.topics.find(t => t.guid === topicGuid) : undefined;
    if (!topic) {
      topic = {
        guid: guid(),
        number: this.nextNumber(project.topics),
        title: draft.title || `Замечание ${this.nextNumber(project.topics)}`,
        description: draft.description,
        status: draft.status,
        priority: draft.priority,
        type: draft.type,
        labels: draft.labels,
        assignedTo: draft.assignedTo,
        area: draft.area,
        milestone: draft.milestone,
        deadline: draft.deadline,
        creationAuthor: author,
        creationDate: isoNow(),
        comments: [],
        viewpoints: []
      };
      project.topics.unshift(topic);
    } else {
      topic.title = draft.title || topic.title;
      topic.description = draft.description;
      topic.status = draft.status;
      topic.priority = draft.priority;
      topic.type = draft.type;
      topic.labels = draft.labels;
      topic.assignedTo = draft.assignedTo;
      topic.area = draft.area;
      topic.milestone = draft.milestone;
      topic.deadline = draft.deadline;
      topic.modifiedAuthor = author;
      topic.modifiedDate = isoNow();
    }
    this.selectedTopicGuid = topic.guid;
    await this.store.save(project);
    treeBus.emit();
    await this.ui.info(`Сохранено замечание: ${topic.title}`);
  }

  async addComment(topicGuid: string, message: string, author = "Пользователь Topomatic"): Promise<void> {
    const project = await this.store.load();
    const topic = project.topics.find(t => t.guid === topicGuid);
    if (!topic || !message.trim()) return;
    topic.comments.push({ guid: guid(), author, date: isoNow(), message: message.trim() });
    topic.modifiedAuthor = author;
    topic.modifiedDate = isoNow();
    await this.store.save(project);
    this.selectedTopicGuid = topicGuid;
    treeBus.emit();
  }

  async setStatus(topicGuid: string, status: IssueTopic["status"], author = "Пользователь Topomatic"): Promise<void> {
    const project = await this.store.load();
    const topic = project.topics.find(t => t.guid === topicGuid);
    if (!topic) return;
    topic.status = status;
    topic.modifiedAuthor = author;
    topic.modifiedDate = isoNow();
    topic.comments.push({ guid: guid(), author, date: isoNow(), message: `Статус изменён: ${status}` });
    await this.store.save(project);
    treeBus.emit();
  }

  async deleteTopic(topicGuid: string): Promise<void> {
    const project = await this.store.load();
    project.topics = project.topics.filter(t => t.guid !== topicGuid);
    if (this.selectedTopicGuid === topicGuid) this.selectedTopicGuid = project.topics[0]?.guid;
    await this.store.save(project);
    treeBus.emit();
    await this.ui.info("Замечание удалено");
  }

  async getTopicDraft(topicGuid?: string): Promise<TopicDraft> {
    const project = await this.store.load();
    const topic = topicGuid ? project.topics.find(t => t.guid === topicGuid) : undefined;
    if (!topic) return { ...DEFAULT_TOPIC_DRAFT };
    return {
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

  private nextNumber(topics: IssueTopic[]): number {
    return topics.reduce((max, item) => Math.max(max, item.number), 0) + 1;
  }

  private suggestArchiveName(project: IssueProject, options: ExportOptions): string {
    const base = `${project.name.replace(/[^a-zA-Zа-яА-Я0-9._-]+/g, "_") || "bcf-project"}_v${options.version}`;
    return `${base}${options.container}`;
  }
}
