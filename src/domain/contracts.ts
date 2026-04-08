import { BcfVersion, IssueProject, IssueTopic, TopicEditorInput } from "./model";

export interface QuickPickItem {
  key: string;
  label: string;
  description?: string;
  detail?: string;
}

export interface ActiveTreeNode {
  id: string;
  contextValue?: string;
  label?: string;
}

export interface TopicStore {
  load(): Promise<IssueProject>;
  save(project: IssueProject): Promise<void>;
}

export interface ArchiveReader {
  read(buffer: Uint8Array): Promise<IssueProject>;
}

export interface ArchiveWriter {
  write(project: IssueProject, version: BcfVersion): Promise<Uint8Array>;
}

export interface SelectionComponent {
  id?: string;
  ifcGuid?: string;
  modelRef?: string;
  layerName?: string;
  elementName?: string;
  elementType?: string;
  visible?: boolean;
  selected?: boolean;
  color?: string;
}

export interface BrowserActions {
  selectTopic(topicGuid: string): Promise<void>;
  openTopic(topicGuid: string): Promise<void>;
  createTopic(): Promise<void>;
  editTopic(topicGuid: string): Promise<void>;
  deleteTopic(topicGuid: string): Promise<void>;
  addComment(topicGuid: string): Promise<void>;
  setStatus(topicGuid: string, status: "Активно" | "Устранено" | "Закрыто"): Promise<void>;
  importArchive(): Promise<void>;
  exportArchive(): Promise<void>;
  refresh(): Promise<void>;
}

export interface UiBridge {
  info(message: string): Promise<void>;
  warn(message: string): Promise<void>;
  error(message: string): Promise<void>;
  quickPick<T extends QuickPickItem>(items: T[], placeholder: string): Promise<T | undefined>;
  inputBox(prompt: string, value?: string): Promise<string | undefined>;
  pickOpenFile(filenameExtension: string): Promise<Uint8Array | undefined>;
  pickSaveWorkspace(defaultName: string): Promise<Workspace | undefined>;
  saveBinary(workspace: Workspace, data: Uint8Array): Promise<void>;
  chooseExportVersion(defaultVersion: BcfVersion): Promise<BcfVersion | undefined>;
  showIssueBrowser(project: IssueProject, actions: BrowserActions): Promise<void>;
  showIssueEditor(initial: TopicEditorInput, options: { mode: "create" | "edit"; snapshotBase64?: string; commentsHint?: string }): Promise<TopicEditorInput | undefined>;
  showTopicDetails(topic: IssueTopic): Promise<void>;
  confirm(title: string, message: string): Promise<boolean>;
  refreshViews(): Promise<void>;
}

export interface ModelBridge {
  getCurrentSelection(): Promise<SelectionComponent[]>;
  getCurrentSnapshotBase64(): Promise<string | undefined>;
  focusTopic(topic: IssueTopic): Promise<void>;
  getActiveTreeNode(): ActiveTreeNode | undefined;
  debugContextSnapshot(): Record<string, unknown>;
}
