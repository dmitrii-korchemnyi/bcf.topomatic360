import { BrowserActions } from "../domain/contracts";
import { IssueProject, IssueTopic } from "../domain/model";

export function mountIssueBrowserDialog(el: HTMLElement, project: IssueProject, actions: BrowserActions): void {
  let selectedGuid: string | undefined = project.topics[0]?.guid;
  const root = document.createElement("div");
  root.className = "bcf-browser";
  el.replaceChildren(root);

  const render = () => {
    const selected = project.topics.find((item) => item.guid === selectedGuid) || project.topics[0];
    root.innerHTML = `
      <style>
        .bcf-browser { font-family: Inter, Arial, sans-serif; color:#111827; min-width:1200px; max-width:1440px; min-height:760px; }
        .bcf-toolbar { display:flex; align-items:center; gap:8px; padding:10px 0 14px; }
        .bcf-toolbar__title { font-size:18px; font-weight:600; margin-right:auto; }
        .bcf-btn { border:1px solid #d4dbe7; background:#fff; border-radius:8px; padding:8px 12px; cursor:pointer; }
        .bcf-btn--primary { background:#2563eb; color:#fff; border-color:#2563eb; }
        .bcf-shell { display:grid; grid-template-columns: 1.1fr 0.9fr; gap:14px; min-height:700px; }
        .bcf-panel { background:#fff; border:1px solid #d7dee8; border-radius:10px; min-height:0; display:grid; }
        .bcf-grid { padding:12px; overflow:auto; display:grid; grid-template-columns:repeat(3,minmax(180px,1fr)); gap:12px; align-content:start; }
        .bcf-card { background:#f8fafc; border:1px solid #d6dee9; border-radius:10px; overflow:hidden; cursor:pointer; }
        .bcf-card.active { outline:2px solid #2563eb; }
        .bcf-card__img { height:120px; background:#dde4ee center/cover no-repeat; }
        .bcf-card__body { padding:10px; }
        .bcf-card__title { font-size:13px; font-weight:600; line-height:1.35; min-height:36px; }
        .bcf-card__meta { margin-top:8px; color:#6b7280; font-size:12px; }
        .bcf-detail { grid-template-rows:auto auto 1fr; }
        .bcf-detail__head { padding:12px; border-bottom:1px solid #e4e9f1; }
        .bcf-detail__title { font-size:16px; font-weight:600; margin-bottom:10px; }
        .bcf-detail__grid { display:grid; grid-template-columns:1fr 190px; gap:12px; }
        .bcf-preview { width:100%; height:120px; border:1px solid #d7dee8; border-radius:8px; object-fit:contain; background:#f3f6fb; }
        .bcf-kv { display:grid; grid-template-columns:140px 1fr; gap:8px 12px; font-size:14px; }
        .bcf-kv div:nth-child(odd) { color:#6b7280; }
        .bcf-actions { display:flex; gap:8px; padding:10px 12px; border-bottom:1px solid #e4e9f1; }
        .bcf-tabs { display:grid; grid-template-rows:auto 1fr; min-height:0; }
        .bcf-tabs__bar { display:flex; border-bottom:1px solid #e4e9f1; }
        .bcf-tabs__bar button { flex:1; border:0; background:#fff; padding:10px 12px; cursor:pointer; }
        .bcf-tabs__bar button.active { color:#2563eb; box-shadow: inset 0 -2px 0 #2563eb; font-weight:600; }
        .bcf-tabbody { overflow:auto; padding:12px; }
        .bcf-commentbox { display:grid; grid-template-columns:1fr auto; gap:8px; margin-bottom:12px; }
        .bcf-input { width:100%; box-sizing:border-box; border:1px solid #d4dbe7; border-radius:8px; padding:9px 11px; }
        .bcf-comment { background:#fff; border:1px solid #e4e9f1; border-radius:8px; padding:10px; margin-bottom:10px; }
        .bcf-comment__head { display:flex; justify-content:space-between; gap:12px; color:#6b7280; font-size:12px; margin-bottom:6px; }
        .bcf-empty { color:#6b7280; padding:18px; }
      </style>
      <header class="bcf-toolbar">
        <div class="bcf-toolbar__title">Замечания BCF — ${escapeHtml(project.name)}</div>
        <button class="bcf-btn" data-action="import">Импорт BCFZIP</button>
        <button class="bcf-btn" data-action="export">Экспорт BCFZIP</button>
        <button class="bcf-btn bcf-btn--primary" data-action="create">Создать замечание</button>
      </header>
      <div class="bcf-shell">
        <section class="bcf-panel"><div class="bcf-grid">${renderCards(project.topics, selectedGuid)}</div></section>
        <section class="bcf-panel bcf-detail">${selected ? renderDetails(selected) : `<div class="bcf-empty">Замечаний пока нет.</div>`}</section>
      </div>
    `;

    root.querySelectorAll<HTMLElement>('[data-topic-guid]').forEach((node) => {
      node.addEventListener('click', () => {
        selectedGuid = node.dataset.topicGuid || selectedGuid;
        render();
      });
      node.addEventListener('dblclick', async () => {
        if (node.dataset.topicGuid) await actions.openTopic(node.dataset.topicGuid);
      });
    });

    bind(root, '[data-action="import"]', actions.importArchive);
    bind(root, '[data-action="export"]', actions.exportArchive);
    bind(root, '[data-action="create"]', actions.createTopic);

    if (selected) {
      bind(root, '[data-action="edit"]', () => actions.editTopic(selected.guid));
      bind(root, '[data-action="comment"]', () => actions.addComment(selected.guid));
      bind(root, '[data-action="resolve"]', () => actions.setStatus(selected.guid, 'Устранено'));
      bind(root, '[data-action="close"]', () => actions.setStatus(selected.guid, 'Закрыто'));
      bind(root, '[data-action="reopen"]', () => actions.setStatus(selected.guid, 'Активно'));
      bind(root, '[data-action="delete"]', () => actions.deleteTopic(selected.guid));
      bind(root, '[data-action="focus"]', () => actions.openTopic(selected.guid));
    }
  };

  render();
}

function renderCards(topics: IssueTopic[], selectedGuid: string | undefined): string {
  if (topics.length === 0) {
    return `<div class="bcf-empty">Нет замечаний для отображения.</div>`;
  }
  return topics.map((topic) => {
    const snap = topic.viewpoints[0]?.snapshotBase64
      ? `style="background-image:url(data:image/png;base64,${topic.viewpoints[0].snapshotBase64})"`
      : "";
    return `
      <article class="bcf-card ${topic.guid === selectedGuid ? 'active' : ''}" data-topic-guid="${topic.guid}">
        <div class="bcf-card__img" ${snap}></div>
        <div class="bcf-card__body">
          <div class="bcf-card__title">${topic.number}. ${escapeHtml(topic.title)}</div>
          <div class="bcf-card__meta">${escapeHtml(topic.status)} · ${escapeHtml(topic.priority)}</div>
        </div>
      </article>
    `;
  }).join('');
}

function renderDetails(topic: IssueTopic): string {
  const snapshot = topic.viewpoints[0]?.snapshotBase64
    ? `data:image/png;base64,${topic.viewpoints[0].snapshotBase64}`
    : `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="190" height="120"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="14">Нет снимка</text></svg>')}`;

  return `
    <div class="bcf-detail__head">
      <div class="bcf-detail__title">${topic.number}. ${escapeHtml(topic.title)}</div>
      <div class="bcf-detail__grid">
        <div>
          <div class="bcf-kv">
            <div>Описание</div><div>${escapeHtml(topic.description || '—')}</div>
            <div>Статус</div><div>${escapeHtml(topic.status)}</div>
            <div>Назначено</div><div>${escapeHtml(topic.assignedTo || 'Unassigned')}</div>
            <div>Приоритет</div><div>${escapeHtml(topic.priority)}</div>
            <div>Тип</div><div>${escapeHtml(topic.type)}</div>
            <div>Область</div><div>${escapeHtml(topic.area || '—')}</div>
            <div>Этап</div><div>${escapeHtml(topic.milestone || '—')}</div>
            <div>Срок</div><div>${escapeHtml(topic.deadline || '—')}</div>
          </div>
        </div>
        <div><img class="bcf-preview" src="${snapshot}" alt="preview" /></div>
      </div>
    </div>
    <div class="bcf-actions">
      <button class="bcf-btn" data-action="focus">Перейти к виду</button>
      <button class="bcf-btn" data-action="edit">Изменить</button>
      <button class="bcf-btn" data-action="comment">Добавить комментарий</button>
      <button class="bcf-btn" data-action="resolve">Устранить</button>
      <button class="bcf-btn" data-action="close">Закрыть</button>
      <button class="bcf-btn" data-action="reopen">Переоткрыть</button>
      <button class="bcf-btn" data-action="delete">Удалить</button>
    </div>
    <div class="bcf-tabs">
      <div class="bcf-tabs__bar"><button class="active">Комментарии</button><button disabled>Подробности</button></div>
      <div class="bcf-tabbody">${renderComments(topic)}</div>
    </div>
  `;
}

function renderComments(topic: IssueTopic): string {
  if (topic.comments.length === 0) {
    return `<div class="bcf-empty">Комментариев пока нет.</div>`;
  }
  return topic.comments.slice().reverse().map((comment) => `
    <article class="bcf-comment">
      <div class="bcf-comment__head">
        <span>${escapeHtml(comment.author)}</span>
        <span>${escapeHtml(formatDate(comment.date))}</span>
      </div>
      <div>${escapeHtml(comment.message)}</div>
    </article>
  `).join('');
}

function bind(root: HTMLElement, selector: string, handler: () => Promise<void>): void {
  root.querySelector(selector)?.addEventListener('click', async () => {
    await handler();
  });
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ru-RU');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
