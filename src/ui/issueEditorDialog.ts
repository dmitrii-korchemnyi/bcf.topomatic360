import { TopicEditorInput } from "../domain/model";

export interface IssueEditorDialogOptions {
  mode: "create" | "edit";
  snapshotBase64?: string;
  commentsHint?: string;
  onSave(result: TopicEditorInput): Promise<void> | void;
  onCancel(): void;
}

const ISSUE_TYPES = ["Замечание", "Коллизия", "Проверка", "Вопрос", "Предложение", "Ошибка моделирования"] as const;
const ISSUE_PRIORITIES = ["Не задан", "Низкий", "Обычный", "Высокий", "Критический"] as const;
const ISSUE_STATUSES = ["Активно", "Устранено", "Закрыто"] as const;

export function mountIssueEditorDialog(el: HTMLElement, initial: TopicEditorInput, options: IssueEditorDialogOptions): void {
  const root = document.createElement("div");
  root.className = "bcf-editor";
  root.innerHTML = `
    <style>
      .bcf-editor { font-family: Inter, Arial, sans-serif; color:#1f2937; min-width:980px; max-width:1140px; }
      .bcf-editor__grid { display:grid; grid-template-columns: 1.35fr 0.95fr; gap:16px; }
      .bcf-editor__section { background:#fff; border:1px solid #d7dee8; border-radius:10px; padding:14px; }
      .bcf-editor__title { font-size:18px; font-weight:600; margin:0 0 10px; }
      .bcf-editor__sub { font-size:12px; color:#6b7280; margin:0 0 12px; }
      .bcf-field { margin-bottom:12px; }
      .bcf-field label { display:block; font-size:12px; color:#6b7280; margin-bottom:4px; }
      .bcf-input, .bcf-select, .bcf-textarea { width:100%; box-sizing:border-box; border:1px solid #cfd8e3; border-radius:8px; padding:10px 12px; background:#fff; }
      .bcf-textarea { min-height:90px; resize:vertical; }
      .bcf-two { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
      .bcf-three { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
      .bcf-tags { width:100%; box-sizing:border-box; border:1px solid #cfd8e3; border-radius:8px; padding:10px 12px; background:#fff; min-height:42px; }
      .bcf-preview { width:100%; min-height:220px; border:1px dashed #cfd8e3; border-radius:10px; display:flex; align-items:center; justify-content:center; background:#f8fafc; overflow:hidden; }
      .bcf-preview img { display:block; width:100%; height:100%; object-fit:contain; }
      .bcf-hint { font-size:12px; color:#6b7280; line-height:1.45; }
      .bcf-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:16px; }
      .bcf-btn { border:1px solid #cfd8e3; background:#fff; border-radius:8px; padding:9px 14px; cursor:pointer; }
      .bcf-btn--primary { background:#2563eb; border-color:#2563eb; color:#fff; }
      .bcf-note { margin-top:10px; font-size:12px; color:#6b7280; }
      .bcf-error { color:#b91c1c; font-size:12px; margin-top:6px; }
    </style>
    <div class="bcf-editor__grid">
      <section class="bcf-editor__section">
        <h2 class="bcf-editor__title">${options.mode === "create" ? "Создание замечания" : "Редактирование замечания"}</h2>
        <p class="bcf-editor__sub">Интерфейс намеренно построен по логике BIMcollab: краткий явный заголовок, подробности в описании, все поля доступны сразу.</p>
        <div class="bcf-field">
          <label>Название *</label>
          <input class="bcf-input" data-field="title" />
          <div class="bcf-error" data-error="title"></div>
        </div>
        <div class="bcf-field">
          <label>Описание</label>
          <textarea class="bcf-textarea" data-field="description"></textarea>
        </div>
        <div class="bcf-field">
          <label>Метки (через запятую)</label>
          <input class="bcf-input" data-field="labels" />
        </div>
        <div class="bcf-two">
          <div class="bcf-field">
            <label>Назначено</label>
            <input class="bcf-input" data-field="assignedTo" />
          </div>
          <div class="bcf-field">
            <label>Область / Зона</label>
            <input class="bcf-input" data-field="area" />
          </div>
        </div>
        <div class="bcf-three">
          <div class="bcf-field">
            <label>Этап</label>
            <input class="bcf-input" data-field="milestone" />
          </div>
          <div class="bcf-field">
            <label>Срок</label>
            <input class="bcf-input" data-field="deadline" placeholder="YYYY-MM-DD" />
          </div>
          <div class="bcf-field">
            <label>Статус</label>
            <select class="bcf-select" data-field="status"></select>
          </div>
        </div>
        <div class="bcf-two">
          <div class="bcf-field">
            <label>Тип</label>
            <select class="bcf-select" data-field="type"></select>
          </div>
          <div class="bcf-field">
            <label>Приоритет</label>
            <select class="bcf-select" data-field="priority"></select>
          </div>
        </div>
      </section>
      <section class="bcf-editor__section">
        <h2 class="bcf-editor__title">Видовая точка</h2>
        <div class="bcf-preview">${options.snapshotBase64 ? `<img src="data:image/png;base64,${options.snapshotBase64}" alt="snapshot" />` : `<span class="bcf-hint">Снимок не получен из модели. Замечание всё равно можно создать, но без preview.</span>`}</div>
        <p class="bcf-note">${escapeHtml(options.commentsHint || "Всегда создавайте понятный viewpoint и связывайте issue с объектами модели.")}</p>
      </section>
    </div>
    <div class="bcf-actions">
      <button class="bcf-btn" data-action="cancel">Отмена</button>
      <button class="bcf-btn bcf-btn--primary" data-action="save">Сохранить</button>
    </div>
  `;

  el.replaceChildren(root);

  const setValue = (field: string, value: string) => {
    const control = root.querySelector<HTMLElement>(`[data-field="${field}"]`);
    if (!control) return;
    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) {
      control.value = value;
    }
  };

  populateSelect(root.querySelector('[data-field="status"]') as HTMLSelectElement, ISSUE_STATUSES, initial.status);
  populateSelect(root.querySelector('[data-field="type"]') as HTMLSelectElement, ISSUE_TYPES, initial.type);
  populateSelect(root.querySelector('[data-field="priority"]') as HTMLSelectElement, ISSUE_PRIORITIES, initial.priority);

  setValue("title", initial.title || "");
  setValue("description", initial.description || "");
  setValue("labels", (initial.labels || []).join(", "));
  setValue("assignedTo", initial.assignedTo || "Unassigned");
  setValue("area", initial.area || "");
  setValue("milestone", initial.milestone || "");
  setValue("deadline", initial.deadline || "");

  root.querySelector('[data-action="cancel"]')?.addEventListener("click", () => options.onCancel());
  root.querySelector('[data-action="save"]')?.addEventListener("click", async () => {
    const result = readEditorResult(root, initial);
    if (!result.title.trim()) {
      const error = root.querySelector<HTMLElement>('[data-error="title"]');
      if (error) error.textContent = "Заполните название замечания.";
      return;
    }
    await options.onSave(result);
  });
}

function readEditorResult(root: HTMLElement, initial: TopicEditorInput): TopicEditorInput {
  const value = (field: string) => (root.querySelector(`[data-field="${field}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)?.value ?? "";
  return {
    guid: initial.guid,
    number: initial.number,
    title: value("title").trim(),
    description: value("description").trim(),
    status: value("status") as TopicEditorInput["status"],
    priority: value("priority") as TopicEditorInput["priority"],
    type: value("type") as TopicEditorInput["type"],
    labels: value("labels").split(",").map((x) => x.trim()).filter(Boolean),
    assignedTo: value("assignedTo").trim(),
    area: value("area").trim(),
    milestone: value("milestone").trim(),
    deadline: value("deadline").trim()
  };
}

function populateSelect(select: HTMLSelectElement, values: readonly string[], current: string): void {
  select.innerHTML = values.map((item) => `<option value="${escapeHtml(item)}" ${item === current ? "selected" : ""}>${escapeHtml(item)}</option>`).join("");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
