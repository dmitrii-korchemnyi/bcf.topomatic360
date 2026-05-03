import { createEmptyProject } from "../domain/defaults";
import type { InternalBcfIssue, InternalBcfProject } from "../domain/model";

type Listener = (project: InternalBcfProject) => void;

class IssueStore {
  private project: InternalBcfProject = createEmptyProject();
  private dirty = false;
  private listeners = new Set<Listener>();

  getProject(): InternalBcfProject {
    return this.project;
  }

  isDirty(): boolean {
    return this.dirty;
  }

  replaceProject(project: InternalBcfProject, dirty = false): void {
    this.project = project;
    this.dirty = dirty;
    this.emit();
  }

  addIssue(issue: InternalBcfIssue): void {
    this.project = {
      ...this.project,
      issues: [...this.project.issues, issue]
    };
    this.dirty = true;
    this.emit();
  }

  updateIssue(issue: InternalBcfIssue): void {
    this.project = {
      ...this.project,
      issues: this.project.issues.map((candidate) => (candidate.guid === issue.guid ? issue : candidate))
    };
    this.dirty = true;
    this.emit();
  }

  findIssue(guid: string): InternalBcfIssue | undefined {
    return this.project.issues.find((issue) => issue.guid === guid);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.project);
    }
  }
}

export const issueStore = new IssueStore();
