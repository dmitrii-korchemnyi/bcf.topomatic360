import { create } from "xmlbuilder2";
import { BcfVersion, CameraState, CommentItem, ComponentRef, IssuePriority, IssueStatus, IssueTopic, IssueType, Viewpoint } from "../domain/model";

export const BCF21_NS = "http://www.buildingsmart-tech.org/bcf/2.1";
export const BCF30_NS = "http://www.buildingsmart-tech.org/bcf/3.0";

export function normalizeVersion(value: string | undefined): BcfVersion {
  if (value === "3.1") return "3.1";
  if (value === "3.0") return "3.0";
  return "2.1";
}

export function topicStatusToBcf(value: IssueStatus): string {
  switch (value) {
    case "Устранено": return "Resolved";
    case "Закрыто": return "Closed";
    default: return "Active";
  }
}

export function topicStatusFromBcf(value: string | undefined): IssueStatus {
  switch ((value ?? "").toLowerCase()) {
    case "resolved": return "Устранено";
    case "closed": return "Закрыто";
    default: return "Активно";
  }
}

export function topicPriorityFromBcf(value: string | undefined): IssuePriority {
  const v = (value ?? "").trim().toLowerCase();
  if (["low", "низкий"].includes(v)) return "Низкий";
  if (["medium", "normal", "обычный"].includes(v)) return "Обычный";
  if (["high", "высокий"].includes(v)) return "Высокий";
  if (["critical", "urgent", "критический"].includes(v)) return "Критический";
  return "Не задан";
}

export function topicPriorityToBcf(value: IssuePriority): string | undefined {
  switch (value) {
    case "Низкий": return "Low";
    case "Обычный": return "Normal";
    case "Высокий": return "High";
    case "Критический": return "Critical";
    default: return undefined;
  }
}

export function topicTypeFromBcf(value: string | undefined): IssueType {
  const v = (value ?? "").trim().toLowerCase();
  if (["clash", "collision", "коллизия"].includes(v)) return "Коллизия";
  if (["check", "проверка"].includes(v)) return "Проверка";
  if (["question", "вопрос"].includes(v)) return "Вопрос";
  if (["proposal", "suggestion", "предложение"].includes(v)) return "Предложение";
  if (["modeling error", "ошибка моделирования"].includes(v)) return "Ошибка моделирования";
  return "Замечание";
}

export function topicTypeToBcf(value: IssueType): string | undefined {
  switch (value) {
    case "Коллизия": return "Clash";
    case "Проверка": return "Check";
    case "Вопрос": return "Question";
    case "Предложение": return "Proposal";
    case "Ошибка моделирования": return "Modeling Error";
    default: return "Issue";
  }
}

export function parseXmlObject(xml: string): any {
  return create(xml).end({ format: "object" }) as any;
}

export function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

export function buildVersionXml(version: BcfVersion): string {
  const ns = version === "2.1" ? BCF21_NS : BCF30_NS;
  return create({ version: "1.0", encoding: "UTF-8" })
    .ele("Version", { xmlns: ns, VersionId: version })
    .end({ prettyPrint: true });
}

export function buildProjectXml(projectId: string, name: string, version: BcfVersion): string {
  const ns = version === "2.1" ? BCF21_NS : BCF30_NS;
  const root = create({ version: "1.0", encoding: "UTF-8" })
    .ele("ProjectExtension", { xmlns: ns })
      .ele("Project")
        .ele("Name").txt(name).up()
        .ele("ProjectId").txt(projectId).up()
      .up()
    .up();
  return root.end({ prettyPrint: true });
}

export function buildMarkupXml(topic: IssueTopic, version: BcfVersion): string {
  const ns = version === "2.1" ? BCF21_NS : BCF30_NS;
  const root = create({ version: "1.0", encoding: "UTF-8" })
    .ele("Markup", { xmlns: ns });

  const topicNode = root.ele("Topic", { Guid: topic.guid });
  topicNode.ele("Title").txt(topic.title).up();
  if (topic.description) topicNode.ele("Description").txt(topic.description).up();
  topicNode.ele("CreationDate").txt(topic.creationDate).up();
  topicNode.ele("CreationAuthor").txt(topic.creationAuthor).up();
  topicNode.ele("TopicStatus").txt(topicStatusToBcf(topic.status)).up();
  const priority = topicPriorityToBcf(topic.priority);
  if (priority) topicNode.ele("Priority").txt(priority).up();
  const topicType = topicTypeToBcf(topic.type);
  if (topicType) topicNode.ele("TopicType").txt(topicType).up();
  if (topic.assignedTo) topicNode.ele("AssignedTo").txt(topic.assignedTo).up();
  if (topic.area) topicNode.ele("Stage").txt(topic.area).up();
  if (topic.milestone) topicNode.ele("DueDate").txt(topic.milestone).up();
  if (topic.deadline) topicNode.ele("DueDate").txt(topic.deadline).up();
  if (topic.modifiedDate) topicNode.ele("ModifiedDate").txt(topic.modifiedDate).up();
  if (topic.modifiedAuthor) topicNode.ele("ModifiedAuthor").txt(topic.modifiedAuthor).up();
  for (const label of topic.labels) {
    topicNode.ele("Labels").ele("Label").txt(label).up().up();
  }
  topicNode.up();

  for (const comment of topic.comments) {
    appendComment(root, comment);
  }

  if (topic.viewpoints.length > 0) {
    const viewpointsNode = root.ele("Viewpoints");
    for (const viewpoint of topic.viewpoints) {
      const vp = viewpointsNode.ele("ViewPoint");
      vp.ele("Guid").txt(viewpoint.guid).up();
      vp.ele("Viewpoint").txt(`${viewpoint.guid}.bcfv`).up();
      if (viewpoint.snapshotFileName) {
        vp.ele("Snapshot").txt(viewpoint.snapshotFileName).up();
      }
      vp.up();
    }
    viewpointsNode.up();
  }

  return root.end({ prettyPrint: true });
}

function appendComment(root: any, comment: CommentItem): void {
  const node = root.ele("Comment", { Guid: comment.guid });
  node.ele("Date").txt(comment.date).up();
  node.ele("Author").txt(comment.author).up();
  node.ele("Comment").txt(comment.message).up();
  if (comment.modifiedDate) node.ele("ModifiedDate").txt(comment.modifiedDate).up();
  if (comment.modifiedAuthor) node.ele("ModifiedAuthor").txt(comment.modifiedAuthor).up();
  node.up();
}

export function buildViewpointXml(viewpoint: Viewpoint, version: BcfVersion): string {
  const ns = version === "2.1" ? BCF21_NS : BCF30_NS;
  const root = create({ version: "1.0", encoding: "UTF-8" })
    .ele("VisualizationInfo", { xmlns: ns, Guid: viewpoint.guid });

  if (viewpoint.camera) {
    appendPerspectiveCamera(root, viewpoint.camera);
  }

  const componentsNode = root.ele("Components");
  appendViewpointComponents(componentsNode, viewpoint.components);
  componentsNode.up();

  return root.end({ prettyPrint: true });
}

function appendPerspectiveCamera(root: any, camera: CameraState): void {
  const node = root.ele("PerspectiveCamera");
  appendPoint(node, "CameraViewPoint", camera.position);
  appendPoint(node, "CameraDirection", camera.direction);
  appendPoint(node, "CameraUpVector", camera.up);
  node.ele("FieldOfView").txt(String(camera.fieldOfView ?? 60)).up();
  node.up();
}

function appendPoint(root: any, name: string, p: { x: number; y: number; z: number }): void {
  root.ele(name)
    .ele("X").txt(String(p.x)).up()
    .ele("Y").txt(String(p.y)).up()
    .ele("Z").txt(String(p.z)).up()
  .up();
}

function appendViewpointComponents(root: any, components: ComponentRef[]): void {
  const selection = root.ele("Selection");
  const visibility = root.ele("Visibility").ele("Exceptions");
  const coloring = root.ele("Coloring");

  const byColor = new Map<string, ComponentRef[]>();

  for (const component of components) {
    if (component.selected) {
      const c = selection.ele("Component");
      appendComponentRef(c, component);
      c.up();
    }

    if (component.visible === false) {
      const c = visibility.ele("Component");
      appendComponentRef(c, component);
      c.up();
    }

    if (component.color) {
      const list = byColor.get(component.color) ?? [];
      list.push(component);
      byColor.set(component.color, list);
    }
  }

  selection.up();
  visibility.up().ele("DefaultVisibility").txt("true").up().up();

  for (const [color, refs] of byColor.entries()) {
    const group = coloring.ele("Color", { Color: normalizeColor(color) });
    const comps = group.ele("Components");
    for (const ref of refs) {
      const c = comps.ele("Component");
      appendComponentRef(c, ref);
      c.up();
    }
    comps.up();
    group.up();
  }
  coloring.up();
}

function appendComponentRef(node: any, component: ComponentRef): void {
  if (component.ifcGuid) node.att("IfcGuid", component.ifcGuid);
  if (component.elementId) node.att("OriginatingSystem", component.elementId);
  if (component.modelRef) node.att("AuthoringToolId", component.modelRef);
}

function normalizeColor(value: string): string {
  const raw = value.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (raw.length === 6) return `FF${raw}`;
  if (raw.length === 8) return raw;
  return "FF4F83CC";
}
