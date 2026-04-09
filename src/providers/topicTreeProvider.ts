import { UiController } from "../domain/contracts";
import { IssueProject, IssueTopic } from "../domain/model";
import { displayDate } from "../utils/dates";
import { treeBus } from "../utils/treeBus";

type BcfTreeItem = TreeItem & { nodeType: "topic" | "comment" | "viewpoint"; topicGuid: string; payloadGuid?: string };

function topicItem(topic: IssueTopic): BcfTreeItem {
  return {
    id: `topic:${topic.guid}`,
    nodeType: "topic",
    topicGuid: topic.guid,
    label: `${topic.number}. ${topic.title}`,
    description: topic.status,
    tooltip: topic.description,
    contextValue: "bcf-topic",
    dblCommand: "bcf:focus-selected-topic"
  };
}

export function buildTopicTreeProvider(service: UiController) {
  return function bcf_build_tree(ctx: Context): TreeViewOptions<BcfTreeItem> {
    const onDidChangeTreeData = ctx.createEventHandler<string | void>();
    treeBus.subscribe(() => onDidChangeTreeData.fire());

    return {
      showCollapseAll: true,
      treeDataProvider: {
        onDidChangeTreeData,
        async getChildren(element) {
          const project: IssueProject = await service.getProject();
          if (!element) {
            return project.topics.map(topicItem);
          }
          const topic = project.topics.find(t => t.guid === element.topicGuid);
          if (!topic) return [];
          if (element.nodeType === "topic") {
            const out: BcfTreeItem[] = [];
            topic.viewpoints.forEach(vp => out.push({ id: `viewpoint:${topic.guid}:${vp.guid}`, nodeType: "viewpoint", topicGuid: topic.guid, payloadGuid: vp.guid, label: vp.title || `Viewpoint ${vp.guid.slice(0, 8)}`, description: `${vp.components.length} эл.`, contextValue: "bcf-viewpoint", dblCommand: "bcf:focus-selected-topic" }));
            topic.comments.forEach(comment => out.push({ id: `comment:${topic.guid}:${comment.guid}`, nodeType: "comment", topicGuid: topic.guid, payloadGuid: comment.guid, label: comment.message.slice(0, 60) || "Комментарий", description: `${comment.author} · ${displayDate(comment.date)}`, tooltip: comment.message, contextValue: "bcf-comment" }));
            return out;
          }
          return [];
        },
        hasChildren(element) {
          return element.nodeType === "topic";
        }
      }
    };
  };
}
