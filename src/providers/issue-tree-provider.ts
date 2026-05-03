import type { TopomaticContext, TreeItem, TreeViewOptions } from "../topomatic/albatros-types";
import { issueStore } from "../application/issue-store";
import { isClosedIssue } from "../application/issue-service";

interface BcfTreeItem extends TreeItem {
  issueGuid?: string;
}

export function build_bcf_issue_tree(ctx: TopomaticContext): TreeViewOptions<BcfTreeItem> {
  const onDidChangeTreeData = ctx.createEventHandler?.<string | void>();

  ctx.treeview?.onDidBroadcast?.((event) => {
    if (event.event === "changeActiveWindow" || event.event === "bcf:changed") {
      onDidChangeTreeData?.fire();
    }
  });

  issueStore.subscribe(() => onDidChangeTreeData?.fire());

  return {
    treeDataProvider: {
      onDidChangeTreeData: onDidChangeTreeData?.event,
      getChildren(element?: BcfTreeItem): BcfTreeItem[] {
        if (!ctx.app) {
          if (ctx.treeview) {
            ctx.treeview.message = "Откройте проект для просмотра BCF-замечаний";
          }
          return [];
        }

        if (ctx.treeview) {
          ctx.treeview.message = undefined;
        }

        if (!element) {
          return buildRoot();
        }

        return element.children ?? [];
      },
      hasChildren(element: BcfTreeItem): boolean {
        return (element.children?.length ?? 0) > 0;
      }
    }
  };
}

function buildRoot(): BcfTreeItem[] {
  const issues = issueStore.getProject().issues;
  const openIssues = issues.filter((issue) => !isClosedIssue(issue));
  const closedIssues = issues.filter(isClosedIssue);

  return [
    {
      id: "bcf-open",
      label: "Открытые",
      description: String(openIssues.length),
      icon: "folder",
      children: openIssues.map(toIssueItem)
    },
    {
      id: "bcf-closed",
      label: "Закрытые",
      description: String(closedIssues.length),
      icon: "folder",
      children: closedIssues.map(toIssueItem)
    }
  ];
}

function toIssueItem(issue: ReturnType<typeof issueStore.getProject>["issues"][number]): BcfTreeItem {
  return {
    id: `issue-${issue.guid}`,
    label: issue.displayId ? `${issue.displayId} ${issue.title}` : issue.title,
    description: issue.status,
    details: issue.assignedTo ?? issue.creationAuthor,
    icon: "report_problem",
    contextValue: "bcfIssueContext",
    issueGuid: issue.guid,
    command: "bcf_open_panel",
    dblCommand: "bcf_open_panel"
  };
}
