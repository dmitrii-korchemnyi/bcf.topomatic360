import { createService } from "../core/shared";
import { buildBcfTree, buildTopicChildren, BcfTreeNode } from "../utils/bcfTree";

export function bcf_tree_provider(ctx: Context): TreeViewOptions<BcfTreeNode> {
  const onDidChangeTreeData = ctx.createEventHandler<string | void>();
  const treeview = (ctx as any).treeview as TreeView<BcfTreeNode> | undefined;

  treeview?.onDidBroadcast?.((event: { event?: string }) => {
    if (["changeActiveWindow", "ss:select", "ss:changed", "bcf:refresh"].includes(event?.event || "")) {
      onDidChangeTreeData.fire();
    }
  });

  return {
    showCollapseAll: true,
    treeDataProvider: {
      onDidChangeTreeData,
      getChildren: async (element?: BcfTreeNode) => {
        const project = await createService(ctx).getProject();
        if (!element) {
          treeview && (treeview.message = project.topics.length === 0 ? "Импортируйте BCFZIP или создайте первое замечание" : undefined);
          return buildBcfTree(project);
        }
        const topic = project.topics.find((item) => item.guid === element.topicGuid);
        if (!topic || element.kind !== "topic") return [];
        return buildTopicChildren(topic);
      },
      hasChildren: (element) => element.kind === "topic"
    }
  };
}
