import { UiController } from "../domain/contracts";
import { IssueProject, IssueTopic } from "../domain/model";
import { displayDate } from "../utils/dates";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function injectStyles(root: HTMLElement): void {
  if (root.querySelector("style[data-bcf-manager]")) return;
  const style = document.createElement("style");
  style.dataset.bcfManager = "true";
  style.textContent = `
  .bcf-shell{font-family:Segoe UI,Arial,sans-serif;display:grid;grid-template-rows:auto 1fr;height:78vh;min-width:980px;color:#14223b}
  .bcf-toolbar{display:flex;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid #d5dce8;background:#fff}
  .bcf-toolbar .title{font-size:18px;font-weight:700;margin-right:auto}
  .bcf-btn{border:1px solid #cfd7e6;background:#fff;border-radius:8px;padding:8px 12px;cursor:pointer}
  .bcf-btn.primary{background:#2266d8;color:#fff;border-color:#2266d8}
  .bcf-layout{display:grid;grid-template-columns:420px 1fr;min-height:0}
  .bcf-list{display:grid;grid-template-rows:auto 1fr;border-right:1px solid #d5dce8;min-height:0;background:#f7f9fc}
  .bcf-list-head{display:flex;gap:8px;padding:10px 12px;border-bottom:1px solid #d5dce8;background:#fff}
  .bcf-search{flex:1;padding:8px 10px;border:1px solid #ccd4e2;border-radius:8px}
  .bcf-items{overflow:auto;padding:10px;display:grid;gap:10px}
  .bcf-card{display:grid;grid-template-columns:96px 1fr;gap:10px;border:1px solid #d7dfea;border-radius:10px;background:#fff;padding:8px;cursor:pointer}
  .bcf-card.active{outline:2px solid #2266d8}
  .bcf-shot{width:96px;height:72px;object-fit:cover;border-radius:8px;background:#e1e7f1}
  .bcf-card h4{margin:0 0 6px;font-size:14px;line-height:1.35}
  .chips{display:flex;flex-wrap:wrap;gap:6px}
  .chip{font-size:12px;padding:3px 8px;border-radius:999px;background:#eef3fb;color:#30507f}
  .bcf-details{display:grid;grid-template-rows:auto auto 1fr;min-height:0}
  .bcf-header{padding:14px;background:#fff;border-bottom:1px solid #d5dce8}
  .bcf-header h2{margin:0 0 8px;font-size:20px}
  .bcf-grid{display:grid;grid-template-columns:1.2fr 260px;gap:14px}
  .bcf-preview{width:100%;height:160px;object-fit:cover;border:1px solid #d5dce8;border-radius:10px;background:#e1e7f1}
  .bcf-kv{display:grid;grid-template-columns:140px 1fr;gap:6px 10px;font-size:14px}
  .bcf-kv .k{color:#6b7890}
  .bcf-actions{display:flex;gap:8px;padding:10px 14px;border-bottom:1px solid #d5dce8;background:#fff;flex-wrap:wrap}
  .bcf-tabs{display:grid;grid-template-rows:auto 1fr;min-height:0}
  .bcf-comments{padding:14px;overflow:auto;background:#f7f9fc}
  .bcf-comment-form{display:grid;grid-template-columns:1fr auto;gap:8px;margin-bottom:12px}
  .bcf-comment-form input{padding:9px 10px;border:1px solid #ccd4e2;border-radius:8px}
  .bcf-comment{background:#fff;border:1px solid #d7dfea;border-radius:10px;padding:10px;margin-bottom:10px}
  .bcf-comment .meta{display:flex;justify-content:space-between;color:#6b7890;font-size:12px;margin-bottom:8px}
  .bcf-empty{padding:18px;color:#6b7890}
  `;
  root.appendChild(style);
}

function pngSrc(topic?: IssueTopic): string {
  if (!topic?.viewpoints[0]?.snapshotBase64) {
    return "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><rect width='100%' height='100%' fill='#e5e9f1'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#627089' font-family='Arial' font-size='14'>Нет снимка</text></svg>`);
  }
  return `data:image/png;base64,${topic.viewpoints[0].snapshotBase64}`;
}

function createCard(topic: IssueTopic, active: boolean, onSelect: () => void, onOpen: () => void): HTMLElement {
  const card = el("div", `bcf-card${active ? " active" : ""}`);
  const img = el("img", "bcf-shot") as HTMLImageElement;
  img.src = pngSrc(topic);
  const body = el("div");
  const h = el("h4", undefined, `${topic.number}. ${topic.title}`);
  const chips = el("div", "chips");
  [topic.status, topic.priority, topic.type].forEach(x => chips.appendChild(el("span", "chip", x)));
  body.appendChild(h);
  body.appendChild(chips);
  card.append(img, body);
  card.addEventListener("click", onSelect);
  card.addEventListener("dblclick", onOpen);
  return card;
}

export function mountIssueManagerDialog(root: HTMLElement, service: UiController): void {
  injectStyles(root);
  const shell = el("div", "bcf-shell");
  const toolbar = el("div", "bcf-toolbar");
  const title = el("div", "title", "BCF Manager");
  const importBtn = el("button", "bcf-btn", "Импорт BCF") as HTMLButtonElement;
  const exportBtn = el("button", "bcf-btn", "Экспорт BCF") as HTMLButtonElement;
  const createBtn = el("button", "bcf-btn primary", "Создать замечание") as HTMLButtonElement;
  toolbar.append(title, importBtn, exportBtn, createBtn);

  const layout = el("div", "bcf-layout");
  const listPane = el("div", "bcf-list");
  const listHead = el("div", "bcf-list-head");
  const search = el("input", "bcf-search") as HTMLInputElement;
  search.placeholder = "Поиск замечаний";
  listHead.append(search);
  const items = el("div", "bcf-items");
  listPane.append(listHead, items);

  const details = el("div", "bcf-details");
  const header = el("div", "bcf-header");
  const actions = el("div", "bcf-actions");
  const openBtn = el("button", "bcf-btn", "Перейти к виду") as HTMLButtonElement;
  const editBtn = el("button", "bcf-btn", "Изменить") as HTMLButtonElement;
  const resolveBtn = el("button", "bcf-btn", "Устранить") as HTMLButtonElement;
  const closeBtn = el("button", "bcf-btn", "Закрыть") as HTMLButtonElement;
  const reopenBtn = el("button", "bcf-btn", "Переоткрыть") as HTMLButtonElement;
  const deleteBtn = el("button", "bcf-btn", "Удалить") as HTMLButtonElement;
  actions.append(openBtn, editBtn, resolveBtn, closeBtn, reopenBtn, deleteBtn);
  const commentsPane = el("div", "bcf-comments");
  details.append(header, actions, commentsPane);

  layout.append(listPane, details);
  shell.append(toolbar, layout);
  root.replaceChildren(shell);

  let project: IssueProject;
  let selectedGuid: string | undefined;

  async function refresh(): Promise<void> {
    project = await service.getProject();
    selectedGuid = (await service.getSelectedTopicGuid()) ?? project.topics[0]?.guid;
    title.textContent = `BCF Manager — ${project.name}`;
    const q = search.value.trim().toLowerCase();
    const topics = project.topics.filter(t => !q || `${t.number} ${t.title} ${t.description}`.toLowerCase().includes(q));
    items.replaceChildren(...(topics.length ? topics.map(t => createCard(t, t.guid === selectedGuid, async () => {
      await service.setSelectedTopic(t.guid);
      refresh();
    }, async () => service.focusTopic(t.guid))) : [el("div", "bcf-empty", "Замечаний пока нет") ]));
    const selected = project.topics.find(t => t.guid === selectedGuid) ?? project.topics[0];
    if (!selected) {
      header.innerHTML = `<div class="bcf-empty">Выберите или создайте замечание</div>`;
      commentsPane.innerHTML = `<div class="bcf-empty">Комментарии появятся здесь</div>`;
      return;
    }
    header.replaceChildren();
    const h2 = el("h2", undefined, `${selected.number}. ${selected.title}`);
    const grid = el("div", "bcf-grid");
    const left = el("div");
    const desc = el("div");
    desc.innerHTML = `<div style="margin-bottom:12px;white-space:pre-wrap">${selected.description || "—"}</div>`;
    const kv = el("div", "bcf-kv");
    const pairs: [string, string | undefined][] = [["Статус", selected.status], ["Назначено", selected.assignedTo || "—"], ["Приоритет", selected.priority], ["Тип", selected.type], ["Область", selected.area || "—"], ["Этап", selected.milestone || "—"], ["Срок", selected.deadline || "—"], ["Создано", displayDate(selected.creationDate)], ["Изменено", displayDate(selected.modifiedDate)]];
    for (const [k,v] of pairs) { kv.append(el("div", "k", k), el("div", "v", v ?? "—")); }
    left.append(desc, kv);
    const right = el("div");
    const preview = el("img", "bcf-preview") as HTMLImageElement;
    preview.src = pngSrc(selected);
    right.append(preview);
    grid.append(left, right);
    header.append(h2, grid);

    commentsPane.replaceChildren();
    const form = el("div", "bcf-comment-form");
    const input = el("input") as HTMLInputElement;
    input.placeholder = "Введите комментарий";
    const sendBtn = el("button", "bcf-btn primary", "Отправить") as HTMLButtonElement;
    form.append(input, sendBtn);
    commentsPane.append(form);
    sendBtn.onclick = async () => {
      if (!input.value.trim()) return;
      await service.addComment(selected.guid, input.value);
      await refresh();
    };
    if (selected.comments.length === 0) commentsPane.append(el("div", "bcf-empty", "Комментариев пока нет"));
    else for (const comment of selected.comments.slice().reverse()) {
      const box = el("div", "bcf-comment");
      const meta = el("div", "meta");
      meta.append(el("strong", undefined, comment.author), el("span", undefined, displayDate(comment.date)));
      const body = el("div", undefined, comment.message);
      box.append(meta, body);
      commentsPane.append(box);
    }

    openBtn.onclick = async () => service.focusTopic(selected.guid);
    editBtn.onclick = async () => { await service.openEditor(selected.guid); await refresh(); };
    resolveBtn.onclick = async () => { await service.setStatus(selected.guid, "Устранена"); await refresh(); };
    closeBtn.onclick = async () => { await service.setStatus(selected.guid, "Закрыта"); await refresh(); };
    reopenBtn.onclick = async () => { await service.setStatus(selected.guid, "Переоткрыта"); await refresh(); };
    deleteBtn.onclick = async () => { await service.deleteTopic(selected.guid); await refresh(); };
  }

  importBtn.onclick = async () => { await service.importArchive(); await refresh(); };
  exportBtn.onclick = async () => { await service.exportArchive(); await refresh(); };
  createBtn.onclick = async () => { await service.createIssueFromSelection(); await refresh(); };
  search.addEventListener("input", () => { void refresh(); });

  void refresh();
}
