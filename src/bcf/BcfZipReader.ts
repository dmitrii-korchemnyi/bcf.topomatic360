import JSZip from "jszip";
import { ArchiveReader } from "../domain/contracts";
import { ComponentRef, IssueProject, IssueTopic, Viewpoint } from "../domain/model";
import {
  ensureArray,
  normalizeVersion,
  parseXmlObject,
  topicPriorityFromBcf,
  topicStatusFromBcf,
  topicTypeFromBcf
} from "./BcfXml";

export class BcfZipReader implements ArchiveReader {
  async read(buffer: Uint8Array): Promise<IssueProject> {
    const zip = await JSZip.loadAsync(buffer);
    const version = await this.readVersion(zip);
    const projectInfo = await this.readProjectInfo(zip);

    const folderNames = new Set<string>();
    for (const key of Object.keys(zip.files)) {
      const parts = key.split("/");
      if (parts.length > 1 && parts[0] && parts[0] !== "__MACOSX") {
        folderNames.add(parts[0]);
      }
    }

    let index = 1;
    const topics: IssueTopic[] = [];

    for (const folder of folderNames) {
      const markupFile = zip.file(`${folder}/markup.bcf`);
      if (!markupFile) continue;

      const markupXml = await markupFile.async("string");
      const markup = parseXmlObject(markupXml);
      const root = markup.Markup ?? markup;
      const topicNode = root.Topic ?? {};
      const labelsNode = ensureArray(topicNode.Labels);
      const commentsNode = ensureArray(root.Comment);
      const viewpointsNode = ensureArray(root.Viewpoints?.ViewPoint ?? root.Viewpoint);
      const viewpoints: Viewpoint[] = [];

      for (const rawViewpoint of viewpointsNode) {
        const fileName = rawViewpoint.Viewpoint ?? rawViewpoint.viewpoint ?? `${rawViewpoint.Guid}.bcfv`;
        const viewpointGuid = rawViewpoint.Guid ?? rawViewpoint.guid ?? folder;
        const viewpoint = await this.readViewpoint(zip, folder, viewpointGuid, fileName, rawViewpoint.Snapshot);
        viewpoints.push(viewpoint);
      }

      topics.push({
        guid: topicNode.Guid ?? folder,
        number: index++,
        title: topicNode.Title ?? topicNode.title ?? "Без названия",
        description: topicNode.Description ?? topicNode.description ?? "",
        status: topicStatusFromBcf(topicNode.TopicStatus ?? topicNode.topicStatus ?? topicNode.Status),
        priority: topicPriorityFromBcf(topicNode.Priority),
        type: topicTypeFromBcf(topicNode.TopicType),
        labels: labelsNode.flatMap((x: any) => ensureArray(x?.Label).map((y: any) => String(y))),
        assignedTo: topicNode.AssignedTo,
        area: topicNode.Stage,
        milestone: topicNode.Milestone,
        deadline: topicNode.DueDate,
        creationAuthor: topicNode.CreationAuthor ?? "unknown",
        creationDate: topicNode.CreationDate ?? new Date().toISOString(),
        modifiedAuthor: topicNode.ModifiedAuthor,
        modifiedDate: topicNode.ModifiedDate,
        comments: commentsNode.map((c: any) => ({
          guid: c.Guid ?? crypto.randomUUID(),
          author: c.Author ?? "unknown",
          date: c.Date ?? new Date().toISOString(),
          message: c.Comment ?? "",
          modifiedDate: c.ModifiedDate,
          modifiedAuthor: c.ModifiedAuthor
        })),
        viewpoints
      });
    }

    return {
      projectId: projectInfo.projectId,
      name: projectInfo.name,
      version,
      topics
    };
  }

  private async readVersion(zip: any): Promise<IssueProject["version"]> {
    const versionFile = zip.file("bcf.version");
    if (!versionFile) return "2.1";
    const xml = await versionFile.async("string");
    const doc = parseXmlObject(xml);
    return normalizeVersion(doc?.Version?.['@VersionId'] ?? doc?.Version?.VersionId);
  }

  private async readProjectInfo(zip: any): Promise<{ projectId: string; name: string }> {
    const projectFile = zip.file("project.bcfp");
    if (!projectFile) {
      return { projectId: crypto.randomUUID(), name: "Импортированный BCF проект" };
    }
    const xml = await projectFile.async("string");
    const doc = parseXmlObject(xml);
    const projectNode = doc?.ProjectExtension?.Project ?? doc?.Project ?? {};
    return {
      projectId: projectNode.ProjectId ?? crypto.randomUUID(),
      name: projectNode.Name ?? "Импортированный BCF проект"
    };
  }

  private async readViewpoint(zip: any, folder: string, guid: string, fileName: string, snapshotName?: string): Promise<Viewpoint> {
    const vpFile = zip.file(`${folder}/${fileName}`);
    let components: ComponentRef[] = [];
    let camera: Viewpoint["camera"];
    if (vpFile) {
      const xml = await vpFile.async("string");
      const doc = parseXmlObject(xml);
      const root = doc.VisualizationInfo ?? doc;
      components = this.parseComponents(root.Components ?? {});
      camera = this.parseCamera(root.PerspectiveCamera);
    }

    let snapshotBase64: string | undefined;
    let snapshotFileName: string | undefined;
    if (snapshotName) {
      const snapFile = zip.file(`${folder}/${snapshotName}`);
      if (snapFile) {
        snapshotBase64 = await snapFile.async("base64");
        snapshotFileName = snapshotName;
      }
    }

    return {
      guid,
      title: fileName,
      snapshotBase64,
      snapshotFileName,
      camera,
      componentsMode: "Выбранные",
      components
    };
  }

  private parseComponents(node: any): ComponentRef[] {
    const refs: ComponentRef[] = [];
    const selection = ensureArray(node?.Selection?.Component);
    const exceptions = ensureArray(node?.Visibility?.Exceptions?.Component);

    for (const raw of selection) refs.push(this.fromComponentNode(raw, true, true));
    for (const raw of exceptions) refs.push(this.fromComponentNode(raw, false, false));

    const colors = ensureArray(node?.Coloring?.Color);
    for (const colorNode of colors) {
      const color = colorNode?.['@Color'] ?? colorNode?.Color;
      for (const raw of ensureArray(colorNode?.Components?.Component)) {
        const parsed = this.fromComponentNode(raw, undefined, undefined);
        parsed.color = color;
        refs.push(parsed);
      }
    }

    return dedupeComponents(refs);
  }

  private fromComponentNode(raw: any, selected?: boolean, visible?: boolean): ComponentRef {
    return {
      ifcGuid: raw?.['@IfcGuid'] ?? raw?.IfcGuid,
      elementId: raw?.['@OriginatingSystem'] ?? raw?.OriginatingSystem,
      modelRef: raw?.['@AuthoringToolId'] ?? raw?.AuthoringToolId,
      selected,
      visible
    };
  }

  private parseCamera(node: any): Viewpoint["camera"] | undefined {
    if (!node) return undefined;
    const readPoint = (p: any) => ({ x: toNumber(p?.X), y: toNumber(p?.Y), z: toNumber(p?.Z) });
    return {
      position: readPoint(node.CameraViewPoint),
      direction: readPoint(node.CameraDirection),
      up: readPoint(node.CameraUpVector),
      fieldOfView: toNumber(node.FieldOfView) || 60
    };
  }
}

function dedupeComponents(items: ComponentRef[]): ComponentRef[] {
  const map = new Map<string, ComponentRef>();
  for (const item of items) {
    const key = item.ifcGuid || item.elementId || `${item.modelRef}:${item.layerName}:${item.elementName}`;
    if (!key) continue;
    const prev = map.get(key);
    map.set(key, { ...prev, ...item });
  }
  return [...map.values()];
}

function toNumber(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}
