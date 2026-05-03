import { issueStore } from "../application/issue-store";
import { isClosedIssue } from "../application/issue-service";
import type { InternalBcfIssue } from "../domain/model";

type IssuePatch = Partial<Pick<InternalBcfIssue, "title" | "description" | "assignedTo" | "status" | "type" | "priority">>;

const STATUS_OPTIONS = ["Active", "Resolved", "Открыто", "В работе", "Решено", "Закрыто"];
const TYPE_OPTIONS = ["Undefined", "Issue", "Remark", "Clash", "Замечание", "Коллизия", "Информация"];
const PRIORITY_OPTIONS = ["Undefined", "Low", "Medium", "High", "Низкий", "Средний", "Высокий"];

export function renderBcfPanel(root: HTMLElement): () => void {
  root.innerHTML = "";

  const style = document.createElement("style");
  style.textContent = `
    .bcf-manager {
      height: 100%;
      min-height: 640px;
      display: grid;
      grid-template-rows: auto auto minmax(230px, 1fr) 210px;
      font: 12px/1.35 "Segoe UI", system-ui, sans-serif;
      color: #111827;
      background: #f3f4f6;
      border-left: 1px solid #cfd4dc;
    }
    .bcf-tabs {
      display: grid;
      grid-template-columns: repeat(4, minmax(90px, 1fr));
      border-bottom: 1px solid #b9c0ca;
      background: #e7e9ed;
    }
    .bcf-tab {
      min-height: 24px;
      border: 0;
      border-right: 1px solid #b9c0ca;
      background: transparent;
      font: inherit;
      cursor: default;
    }
    .bcf-tab.is-active {
      background: #d8ecff;
      border-bottom: 2px solid #2f80ed;
    }
    .bcf-toolbar {
      display: grid;
      grid-template-columns: minmax(140px, 220px) auto 1fr auto;
      gap: 8px;
      align-items: center;
      padding: 6px 8px;
      border-bottom: 1px solid #cfd4dc;
      background: #f8f9fb;
    }
    .bcf-search, .bcf-select, .bcf-input, .bcf-textarea {
      width: 100%;
      box-sizing: border-box;
      min-height: 24px;
      border: 1px solid #aeb7c2;
      border-radius: 2px;
      background: #fff;
      font: inherit;
      padding: 3px 6px;
    }
    .bcf-iconbar, .bcf-actions {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    .bcf-btn {
      min-width: 26px;
      min-height: 24px;
      padding: 2px 8px;
      border: 1px solid #aeb7c2;
      border-radius: 2px;
      background: #fff;
      font: inherit;
      cursor: pointer;
    }
    .bcf-btn:hover { background: #edf5ff; border-color: #2f80ed; }
    .bcf-summary { color: #4b5563; white-space: nowrap; }
    .bcf-table-wrap {
      overflow: auto;
      background: #fff;
      border-bottom: 1px solid #aeb7c2;
    }
    .bcf-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font: inherit;
    }
    .bcf-table th {
      position: sticky;
      top: 0;
      z-index: 1;
      height: 22px;
      padding: 2px 5px;
      border-right: 1px solid #d0d6dd;
      border-bottom: 1px solid #aeb7c2;
      background: #f2f4f7;
      color: #111827;
      font-weight: 400;
      text-align: left;
      white-space: nowrap;
    }
    .bcf-table td {
      height: 22px;
      padding: 2px 5px;
      border-right: 1px solid #edf0f3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .bcf-table tbody tr:nth-child(even) { background: #f5f5f5; }
    .bcf-table tbody tr.is-selected { background: #2f80ed; color: #fff; }
    .bcf-nr { width: 48px; }
    .bcf-modified { width: 92px; }
    .bcf-title-col { width: 48%; }
    .bcf-assigned { width: 110px; }
    .bcf-status { width: 90px; }
    .bcf-author { width: 130px; }
    .bcf-detail {
      display: grid;
      grid-template-rows: auto 1fr auto;
      background: #f4f4f4;
      min-height: 0;
    }
    .bcf-detail-title {
      padding: 8px 10px 4px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .bcf-detail-grid {
      display: grid;
      grid-template-columns: minmax(260px, 1fr) 220px;
      gap: 12px;
      padding: 6px 10px;
      min-height: 0;
    }
    .bcf-description, .bcf-comments {
      border: 1px solid #d1d5db;
      background: #fff;
      padding: 8px;
      overflow: auto;
      min-height: 70px;
    }
    .bcf-comment { margin-bottom: 7px; }
    .bcf-comment-meta { color: #6b7280; margin-bottom: 2px; }
    .bcf-snapshot {
      width: 100%;
      height: 128px;
      object-fit: contain;
      border: 1px solid #d1d5db;
      background: #fff;
    }
    .bcf-detail-footer {
      display: flex;
      gap: 6px;
      align-items: center;
      padding: 6px 10px 8px;
      border-top: 1px solid #d1d5db;
    }
    .bcf-modal-backdrop {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      background: rgba(17, 24, 39, 0.22);
      z-index: 10;
    }
    .bcf-modal {
      width: min(1120px, calc(100% - 36px));
      min-height: 420px;
      background: #f4f4f4;
      border: 1px solid #9ca3af;
      box-shadow: 0 12px 32px rgba(0,0,0,0.22);
      display: grid;
      grid-template-rows: auto 1fr auto;
    }
    .bcf-modal-title {
      padding: 7px 10px;
      border-bottom: 1px solid #d1d5db;
      background: #fbfbfb;
    }
    .bcf-form {
      display: grid;
      grid-template-columns: 88px minmax(280px, 1fr) 110px 180px 90px 180px;
      gap: 10px 8px;
      align-items: start;
      padding: 12px;
    }
    .bcf-label { padding-top: 4px; text-align: right; color: #111827; }
    .bcf-span-3 { grid-column: span 3; }
    .bcf-span-5 { grid-column: span 5; }
    .bcf-modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 10px 12px;
      border-top: 1px solid #d1d5db;
    }
    .bcf-empty {
      padding: 26px;
      color: #6b7280;
      text-align: center;
    }
  `;

  const host = document.createElement("div");
  host.className = "bcf-manager";
  root.style.position = "relative";
  root.append(style, host);

  let selectedGuid: string | undefined;
  let query = "";
  let statusFilter = "All issues";
  let editingGuid: string | undefined;

  const draw = (): void => {
    const project = issueStore.getProject();
    const issues = getFilteredIssues(project.issues, query, statusFilter);
    const selected = selectedGuid ? issueStore.findIssue(selectedGuid) : issues[0];
    selectedGuid = selected?.guid;

    host.innerHTML = "";
    host.append(buildTabs());
    host.append(buildToolbar(project.issues));
    host.append(buildTable(issues));
    host.append(selected ? buildDetails(selected) : empty("Нет выбранного замечания"));

    const editing = editingGuid ? issueStore.findIssue(editingGuid) : undefined;
    root.querySelector(".bcf-modal-backdrop")?.remove();
    if (editing) {
      root.append(buildEditor(editing));
    }
  };

  const buildTabs = (): HTMLElement => {
    const tabs = document.createElement("div");
    tabs.className = "bcf-tabs";
    ["Navigation", "Smart views", "Conflicts", "Issues"].forEach((label) => {
      const button = document.createElement("button");
      button.className = label === "Issues" ? "bcf-tab is-active" : "bcf-tab";
      button.type = "button";
      button.textContent = label;
      tabs.append(button);
    });
    return tabs;
  };

  const buildToolbar = (allIssues: InternalBcfIssue[]): HTMLElement => {
    const toolbar = document.createElement("div");
    toolbar.className = "bcf-toolbar";

    const search = document.createElement("input");
    search.className = "bcf-search";
    search.placeholder = "Search";
    search.value = query;
    search.addEventListener("input", () => {
      query = search.value;
      draw();
    });

    const iconbar = document.createElement("div");
    iconbar.className = "bcf-iconbar";
    iconbar.append(
      button("+", "Создать", () => undefined),
      button("✎", "Редактировать", () => {
        editingGuid = selectedGuid;
        draw();
      }),
      button("−", "Закрыть", () => updateSelected({ status: "Resolved" })),
      button("≡", "Все")
    );

    const summary = document.createElement("div");
    const closed = allIssues.filter(isClosedIssue).length;
    summary.className = "bcf-summary";
    summary.textContent = `${allIssues.length} issues | ${allIssues.length - closed} active | ${closed} resolved`;

    const filter = document.createElement("select");
    filter.className = "bcf-select";
    ["All issues", "Active", "Resolved", "Assigned to me", "With snapshot"].forEach((option) => {
      const element = document.createElement("option");
      element.value = option;
      element.textContent = option;
      filter.append(element);
    });
    filter.value = statusFilter;
    filter.addEventListener("change", () => {
      statusFilter = filter.value;
      draw();
    });

    toolbar.append(search, iconbar, summary, filter);
    return toolbar;
  };

  const buildTable = (issues: InternalBcfIssue[]): HTMLElement => {
    const wrap = document.createElement("div");
    wrap.className = "bcf-table-wrap";
    if (issues.length === 0) {
      wrap.append(empty("Нет BCF-замечаний"));
      return wrap;
    }

    const table = document.createElement("table");
    table.className = "bcf-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th class="bcf-nr">Nr</th>
          <th class="bcf-modified">Modified</th>
          <th class="bcf-title-col">Title</th>
          <th class="bcf-assigned">Assigned to</th>
          <th class="bcf-status">Status</th>
          <th class="bcf-author">Created by</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody")!;

    issues.forEach((issue, index) => {
      const row = document.createElement("tr");
      row.className = issue.guid === selectedGuid ? "is-selected" : "";
      row.innerHTML = `
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      `;
      const cells = Array.from(row.querySelectorAll("td"));
      cells[0].textContent = issue.displayId ?? String(index);
      cells[1].textContent = formatDate(issue.modifiedDate ?? issue.creationDate);
      cells[2].textContent = issue.title;
      cells[3].textContent = issue.assignedTo ?? "Unassigned";
      cells[4].textContent = issue.status;
      cells[5].textContent = issue.creationAuthor;
      row.addEventListener("click", () => {
        selectedGuid = issue.guid;
        draw();
      });
      row.addEventListener("dblclick", () => {
        selectedGuid = issue.guid;
        editingGuid = issue.guid;
        draw();
      });
      tbody.append(row);
    });

    wrap.append(table);
    return wrap;
  };

  const buildDetails = (issue: InternalBcfIssue): HTMLElement => {
    const detail = document.createElement("div");
    detail.className = "bcf-detail";
    const title = document.createElement("div");
    title.className = "bcf-detail-title";
    title.textContent = `${issue.displayId ?? ""} ${issue.title}`.trim();

    const grid = document.createElement("div");
    grid.className = "bcf-detail-grid";
    const description = document.createElement("div");
    description.className = "bcf-description";
    description.textContent = issue.description || "Description";

    const side = document.createElement("div");
    const snapshot = issue.viewpoints.find((viewpoint) => viewpoint.snapshot)?.snapshot;
    if (snapshot) {
      const image = document.createElement("img");
      image.className = "bcf-snapshot";
      image.alt = "Snapshot";
      image.loading = "lazy";
      image.src = URL.createObjectURL(new Blob([snapshot.data.slice().buffer], { type: snapshot.mimeType }));
      side.append(image);
    } else {
      side.append(empty("No snapshot"));
    }

    const comments = document.createElement("div");
    comments.className = "bcf-comments";
    if (issue.comments.length === 0) {
      comments.textContent = "No comments";
    } else {
      issue.comments.forEach((comment) => {
        const item = document.createElement("div");
        item.className = "bcf-comment";
        const meta = document.createElement("div");
        meta.className = "bcf-comment-meta";
        meta.textContent = `${comment.author} · ${formatDate(comment.date)}`;
        const text = document.createElement("div");
        text.textContent = comment.text;
        item.append(meta, text);
        comments.append(item);
      });
    }
    side.append(comments);

    const footer = document.createElement("div");
    footer.className = "bcf-detail-footer";
    footer.append(
      textSpan(`Status: ${issue.status}`),
      button("Resolve", "Resolve", () => updateSelected({ status: "Resolved" })),
      button("Resolve and close", "Resolve and close", () => updateSelected({ status: "Resolved" })),
      button("Edit issue", "Edit issue", () => {
        editingGuid = issue.guid;
        draw();
      })
    );

    grid.append(description, side);
    detail.append(title, grid, footer);
    return detail;
  };

  const buildEditor = (issue: InternalBcfIssue): HTMLElement => {
    const draft: IssuePatch = { ...issue };
    const backdrop = document.createElement("div");
    backdrop.className = "bcf-modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "bcf-modal";
    const header = document.createElement("div");
    header.className = "bcf-modal-title";
    header.textContent = "Edit issue";

    const form = document.createElement("div");
    form.className = "bcf-form";
    form.append(
      label("Title"),
      input(issue.title, (value) => {
        draft.title = value;
      }, "bcf-span-5"),
      label("Description"),
      textarea(issue.description ?? "", (value) => {
        draft.description = value;
      }, "bcf-span-5"),
      label("Assigned to"),
      input(issue.assignedTo ?? "Unassigned", (value) => {
        draft.assignedTo = value === "Unassigned" ? undefined : value;
      }),
      label("Status"),
      select(STATUS_OPTIONS, issue.status, (value) => {
        draft.status = value;
      }),
      label("Type"),
      select(TYPE_OPTIONS, issue.type, (value) => {
        draft.type = value;
      }),
      label("Priority"),
      select(PRIORITY_OPTIONS, issue.priority ?? "Undefined", (value) => {
        draft.priority = value === "Undefined" ? undefined : value;
      }),
      label("Comment"),
      textarea("", () => undefined, "bcf-span-5")
    );

    const footer = document.createElement("div");
    footer.className = "bcf-modal-footer";
    footer.append(
      button("Save", "Save", () => {
        issueStore.updateIssue({
          ...issue,
          ...draft,
          modifiedDate: new Date().toISOString(),
          modifiedAuthor: "Topomatic 360 User"
        });
        editingGuid = undefined;
        draw();
      }),
      button("Resolve", "Resolve", () => {
        issueStore.updateIssue({ ...issue, status: "Resolved", modifiedDate: new Date().toISOString(), modifiedAuthor: "Topomatic 360 User" });
        editingGuid = undefined;
        draw();
      }),
      button("Cancel", "Cancel", () => {
        editingGuid = undefined;
        draw();
      })
    );

    modal.append(header, form, footer);
    backdrop.append(modal);
    return backdrop;
  };

  const updateSelected = (patch: IssuePatch): void => {
    if (!selectedGuid) {
      return;
    }
    const issue = issueStore.findIssue(selectedGuid);
    if (!issue) {
      return;
    }
    issueStore.updateIssue({ ...issue, ...patch, modifiedDate: new Date().toISOString(), modifiedAuthor: "Topomatic 360 User" });
    draw();
  };

  const unsubscribe = issueStore.subscribe(draw);
  draw();
  return unsubscribe;
}

function getFilteredIssues(issues: InternalBcfIssue[], query: string, statusFilter: string): InternalBcfIssue[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");
  return issues.filter((issue) => {
    const matchesQuery = !normalizedQuery || [
      issue.title,
      issue.description,
      issue.assignedTo,
      issue.status,
      issue.creationAuthor
    ].some((value) => value?.toLocaleLowerCase("ru-RU").includes(normalizedQuery));

    if (!matchesQuery) {
      return false;
    }
    if (statusFilter === "Active") {
      return !isClosedIssue(issue);
    }
    if (statusFilter === "Resolved") {
      return isClosedIssue(issue);
    }
    if (statusFilter === "With snapshot") {
      return issue.viewpoints.some((viewpoint) => viewpoint.snapshot);
    }
    return true;
  });
}

function button(text: string, title: string, onClick?: () => void): HTMLButtonElement {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "bcf-btn";
  element.textContent = text;
  element.title = title;
  element.addEventListener("click", () => onClick?.());
  return element;
}

function input(value: string, onChange: (value: string) => void, className = ""): HTMLInputElement {
  const element = document.createElement("input");
  element.className = `bcf-input ${className}`.trim();
  element.value = value;
  element.addEventListener("input", () => onChange(element.value));
  return element;
}

function textarea(value: string, onChange: (value: string) => void, className = ""): HTMLTextAreaElement {
  const element = document.createElement("textarea");
  element.className = `bcf-textarea ${className}`.trim();
  element.rows = 4;
  element.value = value;
  element.addEventListener("input", () => onChange(element.value));
  return element;
}

function select(options: string[], value: string, onChange: (value: string) => void): HTMLSelectElement {
  const element = document.createElement("select");
  element.className = "bcf-select";
  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = option;
    item.textContent = option;
    element.append(item);
  });
  if (!options.includes(value)) {
    const custom = document.createElement("option");
    custom.value = value;
    custom.textContent = value;
    element.prepend(custom);
  }
  element.value = value;
  element.addEventListener("change", () => onChange(element.value));
  return element;
}

function label(text: string): HTMLElement {
  const element = document.createElement("div");
  element.className = "bcf-label";
  element.textContent = text;
  return element;
}

function textSpan(text: string): HTMLElement {
  const element = document.createElement("span");
  element.textContent = text;
  return element;
}

function empty(text: string): HTMLElement {
  const element = document.createElement("div");
  element.className = "bcf-empty";
  element.textContent = text;
  return element;
}

function formatDate(value: string | undefined): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}
