import { UiController } from "../domain/contracts";
import { TopicDraft } from "../domain/model";
import { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES } from "../utils/constants";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function inputRow(label: string, control: HTMLElement): HTMLElement {
  const wrap = el("div", "bcf-form-row");
  const l = el("label", "bcf-form-label", label);
  wrap.append(l, control);
  return wrap;
}

function selectWithOptions(values: string[], selected?: string): HTMLSelectElement {
  const sel = el("select", "bcf-control") as HTMLSelectElement;
  for (const value of values) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    if (value === selected) opt.selected = true;
    sel.appendChild(opt);
  }
  return sel;
}

export async function mountIssueEditorDialog(root: HTMLElement, service: UiController, topicGuid?: string): Promise<void> {
  const project = await service.getProject();
  const topic = topicGuid ? project.topics.find(t => t.guid === topicGuid) : undefined;
  const draft = await service.getTopicDraft(topicGuid);
  const style = document.createElement("style");
  style.textContent = `
  .bcf-editor{font-family:Segoe UI,Arial,sans-serif;display:grid;grid-template-rows:auto 1fr auto;gap:0;height:74vh;min-width:900px;color:#14223b}
  .bcf-editor-head{padding:14px 16px;border-bottom:1px solid #d5dce8;background:#fff}
  .bcf-editor-head h2{margin:0;font-size:20px}
  .bcf-editor-body{padding:16px;overflow:auto;background:#f7f9fc;display:grid;grid-template-columns:1.25fr .85fr;gap:18px}
  .bcf-card{background:#fff;border:1px solid #d5dce8;border-radius:12px;padding:14px}
  .bcf-form-row{display:grid;gap:6px;margin-bottom:12px}
  .bcf-form-label{font-size:12px;color:#66758f}
  .bcf-control{width:100%;padding:9px 10px;border:1px solid #ccd4e2;border-radius:8px;background:#fff}
  textarea.bcf-control{min-height:120px;resize:vertical}
  .bcf-preview{width:100%;height:200px;border-radius:10px;border:1px solid #d5dce8;background:#e1e7f1;object-fit:cover}
  .bcf-footer{padding:12px 16px;border-top:1px solid #d5dce8;background:#fff;display:flex;gap:8px;justify-content:flex-end}
  .bcf-btn{border:1px solid #cfd7e6;background:#fff;border-radius:8px;padding:8px 12px;cursor:pointer}
  .bcf-btn.primary{background:#2266d8;color:#fff;border-color:#2266d8}
  .bcf-chipline{color:#6b7890;font-size:12px;margin-top:10px}
  `;
  const shell = el("div", "bcf-editor");
  const head = el("div", "bcf-editor-head");
  head.append(el("h2", undefined, topicGuid ? "Редактирование замечания" : "Создание замечания"));
  const body = el("div", "bcf-editor-body");

  const left = el("div", "bcf-card");
  const right = el("div", "bcf-card");

  const title = el("input", "bcf-control") as HTMLInputElement; title.value = draft.title;
  const description = el("textarea", "bcf-control") as HTMLTextAreaElement; description.value = draft.description;
  const labels = el("input", "bcf-control") as HTMLInputElement; labels.value = draft.labels.join(", ");
  const assigned = el("input", "bcf-control") as HTMLInputElement; assigned.value = draft.assignedTo ?? "";
  const area = el("input", "bcf-control") as HTMLInputElement; area.value = draft.area ?? "";
  const milestone = el("input", "bcf-control") as HTMLInputElement; milestone.value = draft.milestone ?? "";
  const deadline = el("input", "bcf-control") as HTMLInputElement; deadline.value = draft.deadline ?? "";
  const status = selectWithOptions(ISSUE_STATUSES, draft.status);
  const priority = selectWithOptions(ISSUE_PRIORITIES, draft.priority);
  const type = selectWithOptions(ISSUE_TYPES, draft.type);

  left.append(
    inputRow("Название", title),
    inputRow("Описание", description),
    inputRow("Метки (через запятую)", labels),
    inputRow("Назначено", assigned),
    inputRow("Область", area),
    inputRow("Этап", milestone),
    inputRow("Срок", deadline),
    inputRow("Статус", status),
    inputRow("Тип", type),
    inputRow("Приоритет", priority)
  );

  const preview = el("img", "bcf-preview") as HTMLImageElement;
  preview.src = topic?.viewpoints[0]?.snapshotBase64 ? `data:image/png;base64,${topic.viewpoints[0].snapshotBase64}` : "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200'><rect width='100%' height='100%' fill='#e5e9f1'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#627089' font-family='Arial' font-size='14'>Нет снимка</text></svg>`);
  right.append(preview);
  right.append(el("div", "bcf-chipline", `Viewpoints: ${topic?.viewpoints.length ?? 0}`));
  right.append(el("div", "bcf-chipline", `Комментарии: ${topic?.comments.length ?? 0}`));
  if (!topicGuid) right.append(el("div", "bcf-chipline", "Для нового замечания будет использован текущий выбор и снимок вида."));

  body.append(left, right);

  const footer = el("div", "bcf-footer");
  const saveBtn = el("button", "bcf-btn primary", "Сохранить") as HTMLButtonElement;
  const saveAndResolveBtn = el("button", "bcf-btn", "Сохранить и устранить") as HTMLButtonElement;
  footer.append(saveBtn, saveAndResolveBtn);

  async function buildDraft(): Promise<TopicDraft> {
    return {
      title: title.value.trim(),
      description: description.value.trim(),
      labels: labels.value.split(",").map(x => x.trim()).filter(Boolean),
      assignedTo: assigned.value.trim(),
      area: area.value.trim(),
      milestone: milestone.value.trim(),
      deadline: deadline.value.trim(),
      status: status.value as TopicDraft["status"],
      type: type.value as TopicDraft["type"],
      priority: priority.value as TopicDraft["priority"]
    };
  }

  saveBtn.onclick = async () => { await service.saveDraft(topicGuid, await buildDraft()); };
  saveAndResolveBtn.onclick = async () => {
    const next = await buildDraft();
    next.status = "Устранена";
    await service.saveDraft(topicGuid, next);
  };

  shell.append(style, head, body, footer);
  root.replaceChildren(shell);
}
