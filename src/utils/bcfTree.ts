import { IssueProject, IssueTopic } from "../domain/model";

export interface BcfTreeNode extends TreeItem {
  kind: "topic" | "comment" | "viewpoint";
  topicGuid: string;
}

export function buildBcfTree(project: IssueProject): BcfTreeNode[] {
  return project.topics.map((topic) => buildTopicNode(topic));
}

function buildTopicNode(topic: IssueTopic): BcfTreeNode {
  return {
    id: `topic:${topic.guid}`,
    kind: "topic",
    topicGuid: topic.guid,
    label: `${topic.number}. ${topic.title}`,
    description: `${topic.status} · ${topic.priority}`,
    tooltip: topic.description || topic.title,
    contextValue: "bcfTopicContext",
    command: "bcf_open_topic"
  };
}

export function buildTopicChildren(topic: IssueTopic): BcfTreeNode[] {
  const viewpointNodes = topic.viewpoints.map((viewpoint, index) => ({
    id: `viewpoint:${topic.guid}:${viewpoint.guid}`,
    kind: "viewpoint" as const,
    topicGuid: topic.guid,
    label: `Вид ${index + 1}`,
    description: viewpoint.snapshotFileName || viewpoint.title || "Viewpoint",
    tooltip: viewpoint.title || "Viewpoint",
    contextValue: "bcfViewpointContext",
    command: "bcf_open_topic"
  }));

  const commentNodes = topic.comments.map((comment, index) => ({
    id: `comment:${topic.guid}:${comment.guid}`,
    kind: "comment" as const,
    topicGuid: topic.guid,
    label: `Комментарий ${index + 1}`,
    description: `${comment.author} · ${formatDate(comment.date)}`,
    tooltip: comment.message,
    contextValue: "bcfCommentContext",
    command: "bcf_open_topic"
  }));

  return [...viewpointNodes, ...commentNodes];
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ru-RU");
}
