import { issueStore } from "../application/issue-store";
import { isClosedIssue } from "../application/issue-service";
import type { InternalBcfIssue } from "../domain/model";

export function renderBcfPanel(root: HTMLElement): () => void {
  root.innerHTML = "";
  const style = document.createElement("style");
  style.textContent = `
    .bcf-panel { font: 12px/1.45 system-ui, sans-serif; color: #1f2933; display: grid; gap: 10px; }
    .bcf-toolbar { display: flex; gap: 6px; align-items: center; }
    .bcf-search { flex: 1; min-width: 0; padding: 6px 8px; border: 1px solid #cbd2d9; border-radius: 6px; }
    .bcf-list { display: grid; gap: 6px; max-height: 280px; overflow: auto; }
    .bcf-issue { border: 1px solid #d9e2ec; border-radius: 6px; padding: 8px; background: #fff; cursor: pointer; }
    .bcf-issue:hover { background: #f5f7fa; }
    .bcf-title { font-weight: 650; }
    .bcf-meta { color: #52606d; margin-top: 3px; }
    .bcf-detail { border-top: 1px solid #d9e2ec; padding-top: 10px; display: grid; gap: 8px; }
    .bcf-field { display: grid; gap: 3px; }
    .bcf-field label { color: #52606d; }
    .bcf-field input, .bcf-field textarea, .bcf-field select { width: 100%; box-sizing: border-box; padding: 6px; border: 1px solid #cbd2d9; border-radius: 6px; font: inherit; }
    .bcf-comments { display: grid; gap: 6px; }
    .bcf-comment { background: #f5f7fa; border-radius: 6px; padding: 6px; }
    .bcf-actions { display: flex; gap: 6px; }
    .bcf-button { padding: 6px 10px; border: 1px solid #9fb3c8; border-radius: 6px; background: #f5f7fa; cursor: pointer; }
    .bcf-snapshot { max-width: 100%; border: 1px solid #d9e2ec; border-radius: 6px; }
  `;
  const panel = document.createElement("div");
  panel.className = "bcf-panel";
  root.append(style, panel);

  let selectedGuid: string | undefined;
  let query = "";

  const draw = (): void => {
    const project = issueStore.getProject();
    const issues = project.issues.filter((issue) => issue.title.toLocaleLowerCase("ru-RU").includes(query.toLocaleLowerCase("ru-RU")));
    const selected = selectedGuid ? issueStore.findIssue(selectedGuid) : issues[0];
    selectedGuid = selected?.guid;
    const closed = project.issues.filter(isClosedIssue).length;

    panel.innerHTML = "";
    panel.append(buildToolbar(project.issues.length, project.issues.length - closed, closed));
    panel.append(buildIssueList(issues));
    if (selected) {
      panel.append(buildIssueDetail(selected));
    }
  };

  const buildToolbar = (total: number, open: number, closed: number): HTMLElement => {
    const toolbar = document.createElement("div");
    toolbar.className = "bcf-toolbar";
    const search = document.createElement("input");
    search.className = "bcf-search";
    search.placeholder = "Поиск";
    search.value = query;
    search.addEventListener("input", () => {
      query = search.value;
      draw();
    });
    const counter = document.createElement("span");
    counter.textContent = `${total} | ${open} открытых | ${closed} закрытых`;
    toolbar.append(search, counter);
    return toolbar;
  };

  const buildIssueList = (issues: InternalBcfIssue[]): HTMLElement => {
    const list = document.createElement("div");
    list.className = "bcf-list";
    for (const issue of issues) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "bcf-issue";
      item.innerHTML = `<div class="bcf-title"></div><div class="bcf-meta"></div>`;
      item.querySelector(".bcf-title")!.textContent = issue.title;
      item.querySelector(".bcf-meta")!.textContent = `${issue.status} · ${issue.type} · ${issue.creationAuthor}`;
      item.addEventListener("click", () => {
        selectedGuid = issue.guid;
        draw();
      });
      list.append(item);
    }
    return list;
  };

  const buildIssueDetail = (issue: InternalBcfIssue): HTMLElement => {
    const detail = document.createElement("div");
    detail.className = "bcf-detail";
    const title = inputField("Title", issue.title, (value) => save({ ...issue, title: value }));
    const description = textareaField("Description", issue.description ?? "", (value) => save({ ...issue, description: value }));
    const status = selectField("Status", ["Открыто", "В работе", "Решено", "Закрыто"], issue.status, (value) => save({ ...issue, status: value }));
    const meta = document.createElement("div");
    meta.className = "bcf-meta";
    meta.textContent = `GUID: ${issue.guid}`;
    detail.append(title, description, status, meta);

    const snapshot = issue.viewpoints.find((viewpoint) => viewpoint.snapshot)?.snapshot;
    if (snapshot) {
      const img = document.createElement("img");
      img.className = "bcf-snapshot";
      img.alt = "Snapshot";
      img.loading = "lazy";
      const snapshotBytes = snapshot.data.slice().buffer;
      img.src = URL.createObjectURL(new Blob([snapshotBytes], { type: snapshot.mimeType }));
      detail.append(img);
    }

    const comments = document.createElement("div");
    comments.className = "bcf-comments";
    for (const comment of issue.comments) {
      const item = document.createElement("div");
      item.className = "bcf-comment";
      item.textContent = `${comment.author}: ${comment.text}`;
      comments.append(item);
    }
    detail.append(comments);
    return detail;
  };

  const save = (issue: InternalBcfIssue): void => {
    issueStore.updateIssue({ ...issue, modifiedDate: new Date().toISOString(), modifiedAuthor: "Topomatic 360 User" });
    draw();
  };

  const unsubscribe = issueStore.subscribe(draw);
  draw();
  return unsubscribe;
}

function inputField(labelText: string, value: string, onChange: (value: string) => void): HTMLElement {
  const field = fieldWrap(labelText);
  const input = document.createElement("input");
  input.value = value;
  input.addEventListener("change", () => onChange(input.value));
  field.append(input);
  return field;
}

function textareaField(labelText: string, value: string, onChange: (value: string) => void): HTMLElement {
  const field = fieldWrap(labelText);
  const input = document.createElement("textarea");
  input.rows = 4;
  input.value = value;
  input.addEventListener("change", () => onChange(input.value));
  field.append(input);
  return field;
}

function selectField(labelText: string, options: string[], value: string, onChange: (value: string) => void): HTMLElement {
  const field = fieldWrap(labelText);
  const select = document.createElement("select");
  for (const option of options) {
    const element = document.createElement("option");
    element.value = option;
    element.textContent = option;
    select.append(element);
  }
  select.value = value;
  select.addEventListener("change", () => onChange(select.value));
  field.append(select);
  return field;
}

function fieldWrap(labelText: string): HTMLElement {
  const field = document.createElement("div");
  field.className = "bcf-field";
  const label = document.createElement("label");
  label.textContent = labelText;
  field.append(label);
  return field;
}
