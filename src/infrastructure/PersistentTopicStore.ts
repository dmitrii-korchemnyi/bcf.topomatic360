import { TopicStore } from "../domain/contracts";
import { IssueProject } from "../domain/model";
import { guid } from "../utils/ids";

const STORAGE_KEY = "bcf.project";

export class PersistentTopicStore implements TopicStore {
  private cache: IssueProject | undefined;

  constructor(private readonly settings?: ApplicationSettings) {}

  async load(): Promise<IssueProject> {
    if (this.cache) return structuredClone(this.cache);
    const fromSettings = this.settings ? await this.settings.get<IssueProject>(STORAGE_KEY) : undefined;
    this.cache = fromSettings ?? {
      projectId: guid(),
      name: "Замечания проекта",
      topics: [],
      importVersion: "2.1",
      exportVersion: "2.1"
    };
    return structuredClone(this.cache);
  }

  async save(project: IssueProject): Promise<void> {
    this.cache = structuredClone(project);
    if (this.settings) {
      await this.settings.set(STORAGE_KEY, this.cache);
    }
  }
}
