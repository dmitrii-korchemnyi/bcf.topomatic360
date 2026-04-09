import { ExportOptions, ImportResult, IssueProject, IssueTopic, TopicDraft, ValidationResult } from "./model";

export interface TopicStore {
  load(): Promise<IssueProject>;
  save(project: IssueProject): Promise<void>;
}

export interface ArchiveReader {
  read(buffer: Uint8Array): Promise<ImportResult>;
}

export interface ArchiveWriter {
  write(project: IssueProject, options: ExportOptions): Promise<Uint8Array>;
}

export interface Validator {
  validate(project: IssueProject, options: ExportOptions): ValidationResult;
}

export interface UiBridge {
  info(message: string): Promise<void>;
  warn(message: string): Promise<void>;
  error(message: string): Promise<void>;
  promptVersion(kind: "import" | "export"): Promise<ExportOptions | undefined>;
  promptComment(initial?: string): Promise<string | undefined>;
  openImportFile(): Promise<Uint8Array | undefined>;
  saveArchive(defaultName: string): Promise<Workspace | undefined>;
  openManagerWindow(service: UiController): Promise<void>;
  openEditorWindow(service: UiController, topicGuid?: string): Promise<void>;
  notifyDiagnostics(lines: string[], kind?: "info" | "warning" | "error"): Promise<void>;
}

export interface UiController {
  getProject(): Promise<IssueProject>;
  focusTopic(topicGuid: string): Promise<void>;
  createIssueFromSelection(author?: string): Promise<void>;
  openEditor(topicGuid?: string): Promise<void>;
  saveDraft(topicGuid: string | undefined, draft: TopicDraft, author?: string): Promise<void>;
  setSelectedTopic(topicGuid: string | undefined): Promise<void>;
  getSelectedTopicGuid(): Promise<string | undefined>;
  addComment(topicGuid: string, message: string, author?: string): Promise<void>;
  setStatus(topicGuid: string, status: IssueTopic["status"], author?: string): Promise<void>;
  deleteTopic(topicGuid: string): Promise<void>;
  getTopicDraft(topicGuid?: string): Promise<TopicDraft>;
  importArchive(): Promise<void>;
  exportArchive(): Promise<void>;
}

export interface ModelBridge {
  getCurrentSelection(): Promise<unknown[]>;
  getCurrentSnapshotBase64(): Promise<string | undefined>;
  getCurrentCamera(): Promise<unknown | undefined>;
  focusTopic(topic: IssueTopic): Promise<void>;
}
