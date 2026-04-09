import { BcfService } from "../application/BcfService";

type TreeTopicItem = TreeItem & { topicGuid?: string };

export function createCommands(service: BcfService) {
  return {
    async "bcf:open-manager"(_ctx: Context) {
      await service.openManager();
    },
    async "bcf:create-topic"(_ctx: Context) {
      await service.createIssueFromSelection();
    },
    async "bcf:import"(_ctx: Context) {
      await service.importArchive();
    },
    async "bcf:export"(_ctx: Context) {
      await service.exportArchive();
    },
    async "bcf:edit-selected-topic"(ctx: Context) {
      const item = (ctx.treeview as TreeView<TreeTopicItem> | undefined)?.active;
      await service.openEditor(item?.topicGuid ?? await service.getSelectedTopicGuid());
    },
    async "bcf:focus-selected-topic"(ctx: Context) {
      const item = (ctx.treeview as TreeView<TreeTopicItem> | undefined)?.active;
      const guid = item?.topicGuid ?? await service.getSelectedTopicGuid();
      if (guid) await service.focusTopic(guid);
    },
    async "bcf:delete-selected-topic"(ctx: Context) {
      const item = (ctx.treeview as TreeView<TreeTopicItem> | undefined)?.active;
      const guid = item?.topicGuid ?? await service.getSelectedTopicGuid();
      if (guid) await service.deleteTopic(guid);
    },
    async "bcf:add-comment-selected-topic"(ctx: Context) {
      const item = (ctx.treeview as TreeView<TreeTopicItem> | undefined)?.active;
      const guid = item?.topicGuid ?? await service.getSelectedTopicGuid();
      if (!guid) return;
      const message = await ctx.showInputBox({ prompt: "Комментарий", placeHolder: "Введите комментарий" });
      if (message) await service.addComment(guid, message);
    },
    async "bcf:set-status-resolved"(ctx: Context) {
      const item = (ctx.treeview as TreeView<TreeTopicItem> | undefined)?.active;
      const guid = item?.topicGuid ?? await service.getSelectedTopicGuid();
      if (guid) await service.setStatus(guid, "Устранена");
    },
    async "bcf:set-status-closed"(ctx: Context) {
      const item = (ctx.treeview as TreeView<TreeTopicItem> | undefined)?.active;
      const guid = item?.topicGuid ?? await service.getSelectedTopicGuid();
      if (guid) await service.setStatus(guid, "Закрыта");
    },
    async "bcf:set-status-reopened"(ctx: Context) {
      const item = (ctx.treeview as TreeView<TreeTopicItem> | undefined)?.active;
      const guid = item?.topicGuid ?? await service.getSelectedTopicGuid();
      if (guid) await service.setStatus(guid, "Переоткрыта");
    },
    async "bcf:about"(ctx: Context) {
      const project = await service.getProject();
      await ctx.showMessage([
        "BCF Manager for Topomatic 360",
        `Замечаний: ${project.topics.length}`,
        `Версия по умолчанию: ${project.exportVersion ?? "2.1"}`
      ].join("\n"), "info");
    }
  };
}
