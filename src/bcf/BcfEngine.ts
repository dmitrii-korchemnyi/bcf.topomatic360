import JSZip from "jszip";
import { convert, create } from "xmlbuilder2";
import { ArchiveReader, ArchiveWriter, Validator } from "../domain/contracts";
import { BcfContainer, BcfVersion, ExportOptions, ImportResult, IssueProject, IssueTopic, ValidationMessage, ValidationResult, Viewpoint } from "../domain/model";
import { guid } from "../utils/ids";

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function toBuffer(base64?: string): Uint8Array | undefined {
  if (!base64) return undefined;
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function fromBuffer(buf?: Uint8Array): string | undefined {
  if (!buf) return undefined;
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s);
}

function attr(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return typeof obj["@Guid"] === "string" ? String(obj["@Guid"]) : undefined;
  }
  return undefined;
}

function titleForVersion(version: BcfVersion): string {
  return version === "2.0" ? "2.0" : version === "2.1" ? "2.1" : "3.0";
}

function makeVersionXml(version: BcfVersion): string {
  return create({ version: "1.0", encoding: "UTF-8" })
    .ele("Version", { VersionId: titleForVersion(version) })
    .end({ prettyPrint: true });
}

function makeProjectXml(project: IssueProject): string {
  return create({ version: "1.0", encoding: "UTF-8" })
    .ele("ProjectExtension")
    .ele("Project", { ProjectId: project.projectId })
    .ele("Name").txt(project.name).up()
    .up()
    .up()
    .end({ prettyPrint: true });
}

function buildMarkup(topic: IssueTopic, version: BcfVersion): string {
  const root = create({ version: "1.0", encoding: "UTF-8" }).ele("Markup");
  const t = root.ele("Topic", { Guid: topic.guid, TopicStatus: topic.status, TopicType: topic.type });
  t.ele("Title").txt(topic.title).up();
  if (topic.description) t.ele("Description").txt(topic.description).up();
  t.ele("CreationDate").txt(topic.creationDate).up();
  t.ele("CreationAuthor").txt(topic.creationAuthor).up();
  if (topic.modifiedDate) t.ele("ModifiedDate").txt(topic.modifiedDate).up();
  if (topic.modifiedAuthor) t.ele("ModifiedAuthor").txt(topic.modifiedAuthor).up();
  if (topic.assignedTo) t.ele("AssignedTo").txt(topic.assignedTo).up();
  if (topic.priority) t.ele("Priority").txt(topic.priority).up();
  if (topic.deadline) t.ele("DueDate").txt(topic.deadline).up();
  if (topic.area) t.ele("Labels").ele("Label").txt(topic.area).up().up();
  t.up();

  for (const comment of topic.comments) {
    root.ele("Comment", { Guid: comment.guid })
      .ele("Date").txt(comment.date).up()
      .ele("Author").txt(comment.author).up()
      .ele("Comment").txt(comment.message).up()
      .up();
  }

  if (topic.viewpoints.length > 0) {
    const views = root.ele("Viewpoints");
    for (const vp of topic.viewpoints) {
      const fileName = `${vp.guid}.bcfv`;
      const node = views.ele("ViewPoint");
      if (version === "3.0") {
        node.att("Guid", vp.guid).att("Viewpoint", fileName);
      } else {
        node.ele("Guid").txt(vp.guid).up();
        node.ele("Viewpoint").txt(fileName).up();
        if (vp.snapshotFileName) node.ele("Snapshot").txt(vp.snapshotFileName).up();
      }
      node.up();
    }
    views.up();
  }

  return root.end({ prettyPrint: true });
}

function buildViewpoint(vp: Viewpoint): string {
  const root = create({ version: "1.0", encoding: "UTF-8" }).ele("VisualizationInfo", { Guid: vp.guid });
  if (vp.camera) {
    const c = root.ele("PerspectiveCamera");
    c.ele("CameraViewPoint").ele("X").txt(String(vp.camera.position.x)).up().ele("Y").txt(String(vp.camera.position.y)).up().ele("Z").txt(String(vp.camera.position.z)).up().up();
    c.ele("CameraDirection").ele("X").txt(String(vp.camera.direction.x)).up().ele("Y").txt(String(vp.camera.direction.y)).up().ele("Z").txt(String(vp.camera.direction.z)).up().up();
    c.ele("CameraUpVector").ele("X").txt(String(vp.camera.up.x)).up().ele("Y").txt(String(vp.camera.up.y)).up().ele("Z").txt(String(vp.camera.up.z)).up().up();
    c.ele("FieldOfView").txt("60").up();
    c.up();
  }
  const comps = root.ele("Components");
  const sel = comps.ele("Selection");
  for (const comp of vp.components) {
    sel.ele("Component", {
      IfcGuid: comp.ifcGuid ?? undefined,
      OriginatingSystem: comp.modelRef ?? undefined,
      AuthoringToolId: comp.elementId ?? comp.elementName ?? undefined
    }).up();
  }
  sel.up();
  comps.ele("Visibility", { DefaultVisibility: vp.componentsMode === "Видимые" ? "true" : "false" }).up();
  comps.up();
  return root.end({ prettyPrint: true });
}

function parseVersion(xml?: string): BcfVersion {
  if (!xml) return "2.1";
  const obj = convert(xml, { format: "object" }) as any;
  const versionId = obj?.Version?.["@VersionId"] ?? obj?.Version?.VersionId ?? obj?.Version?.["@versionId"];
  if (String(versionId).startsWith("2.0")) return "2.0";
  if (String(versionId).startsWith("3.0")) return "3.0";
  return "2.1";
}

function parseProject(xml?: string): Pick<IssueProject, "projectId" | "name"> {
  if (!xml) return { projectId: guid(), name: "BCF проект" };
  const obj = convert(xml, { format: "object" }) as any;
  const project = obj?.ProjectExtension?.Project ?? obj?.Project ?? {};
  return {
    projectId: project?.["@ProjectId"] ?? project?.ProjectId ?? guid(),
    name: project?.Name ?? "BCF проект"
  };
}

function extractValue(node: any, key: string): string | undefined {
  return node?.[key] ?? node?.[`@${key}`] ?? undefined;
}

function parseViewpoint(xml: string, snapshotBase64?: string): Viewpoint {
  const obj = convert(xml, { format: "object" }) as any;
  const root = obj?.VisualizationInfo ?? {};
  const camera = root?.PerspectiveCamera;
  const selection = asArray(root?.Components?.Selection?.Component);
  return {
    guid: root?.["@Guid"] ?? guid(),
    title: undefined,
    snapshotBase64,
    snapshotFileName: snapshotBase64 ? "snapshot.png" : undefined,
    camera: camera ? {
      position: {
        x: Number(camera?.CameraViewPoint?.X ?? 0),
        y: Number(camera?.CameraViewPoint?.Y ?? 0),
        z: Number(camera?.CameraViewPoint?.Z ?? 0)
      },
      direction: {
        x: Number(camera?.CameraDirection?.X ?? 0),
        y: Number(camera?.CameraDirection?.Y ?? 0),
        z: Number(camera?.CameraDirection?.Z ?? -1)
      },
      up: {
        x: Number(camera?.CameraUpVector?.X ?? 0),
        y: Number(camera?.CameraUpVector?.Y ?? 0),
        z: Number(camera?.CameraUpVector?.Z ?? 1)
      }
    } : undefined,
    componentsMode: root?.Components?.Visibility?.["@DefaultVisibility"] === "true" ? "Видимые" : "Выбранные",
    components: selection.map((c: any) => ({
      ifcGuid: c?.["@IfcGuid"],
      modelRef: c?.["@OriginatingSystem"],
      elementId: c?.["@AuthoringToolId"]
    }))
  };
}

function parseMarkup(xml: string, folder: string): Partial<IssueTopic> & { viewpointRefs: { guid: string; file: string; snapshot?: string }[] } {
  const obj = convert(xml, { format: "object" }) as any;
  const markup = obj?.Markup ?? {};
  const topic = markup?.Topic ?? {};
  const comments = asArray(markup?.Comment).map((c: any) => ({
    guid: c?.["@Guid"] ?? guid(),
    author: c?.Author ?? "unknown",
    date: c?.Date ?? new Date().toISOString(),
    message: c?.Comment ?? ""
  }));
  const viewRefs = asArray(markup?.Viewpoints?.ViewPoint).map((v: any) => ({
    guid: attr(v) ?? v?.Guid ?? guid(),
    file: v?.Viewpoint ?? `${attr(v) ?? v?.Guid}.bcfv`,
    snapshot: v?.Snapshot
  }));
  return {
    guid: topic?.["@Guid"] ?? folder,
    title: topic?.Title ?? "Без названия",
    description: topic?.Description ?? "",
    status: topic?.["@TopicStatus"] ?? topic?.TopicStatus ?? "Активная",
    type: topic?.["@TopicType"] ?? topic?.TopicType ?? "Замечание",
    priority: topic?.Priority ?? "Обычный",
    assignedTo: topic?.AssignedTo,
    deadline: topic?.DueDate,
    creationAuthor: topic?.CreationAuthor ?? "unknown",
    creationDate: topic?.CreationDate ?? new Date().toISOString(),
    modifiedAuthor: topic?.ModifiedAuthor,
    modifiedDate: topic?.ModifiedDate,
    labels: asArray(topic?.Labels?.Label).filter(Boolean),
    comments,
    viewpointRefs: viewRefs
  };
}

export class BcfValidator implements Validator {
  validate(project: IssueProject, options: ExportOptions): ValidationResult {
    const messages: ValidationMessage[] = [];
    if (!project.name.trim()) messages.push({ level: "warning", message: "У проекта не задано имя." });
    for (const topic of project.topics) {
      if (!topic.guid) messages.push({ level: "error", message: `Замечание №${topic.number}: отсутствует GUID.` });
      if (!topic.title.trim()) messages.push({ level: "error", message: `Замечание №${topic.number}: отсутствует заголовок.` });
      for (const vp of topic.viewpoints) {
        if (!vp.guid) messages.push({ level: "error", message: `Замечание №${topic.number}: viewpoint без GUID.` });
      }
      if (options.version === "2.0" && topic.viewpoints.length > 1) {
        messages.push({ level: "warning", message: `Замечание №${topic.number}: для BCF 2.0 будет экспортирован только первый viewpoint.` });
      }
    }
    return { valid: messages.every(x => x.level !== "error"), messages };
  }
}

export class BcfZipWriter implements ArchiveWriter {
  async write(project: IssueProject, options: ExportOptions): Promise<Uint8Array> {
    const zip = new JSZip();
    zip.file("bcf.version", makeVersionXml(options.version));
    zip.file("project.bcfp", makeProjectXml(project));
    for (const topic of project.topics) {
      const folder = zip.folder(topic.guid)!;
      const effectiveViewpoints = options.version === "2.0" ? topic.viewpoints.slice(0, 1) : topic.viewpoints;
      folder.file("markup.bcf", buildMarkup({ ...topic, viewpoints: effectiveViewpoints }, options.version));
      for (const vp of effectiveViewpoints) {
        folder.file(`${vp.guid}.bcfv`, buildViewpoint(vp));
        const bytes = toBuffer(vp.snapshotBase64);
        if (bytes) folder.file(vp.snapshotFileName ?? `${vp.guid}.png`, bytes);
      }
    }
    return zip.generateAsync({ type: "uint8array" });
  }
}

export class BcfZipReader implements ArchiveReader {
  async read(buffer: Uint8Array): Promise<ImportResult> {
    const zip = await JSZip.loadAsync(buffer);
    const version = parseVersion(await zip.file("bcf.version")?.async("string"));
    const project = parseProject(await zip.file("project.bcfp")?.async("string"));
    const folderNames = new Set<string>();
    for (const key of Object.keys(zip.files)) {
      const parts = key.split("/");
      if (parts.length > 1 && parts[0] && !parts[0].startsWith("__MACOSX")) folderNames.add(parts[0]);
    }
    const topics: IssueTopic[] = [];
    let number = 1;
    const warnings: string[] = [];
    for (const folder of folderNames) {
      const markupXml = await zip.file(`${folder}/markup.bcf`)?.async("string");
      if (!markupXml) continue;
      const parsed = parseMarkup(markupXml, folder);
      const viewpoints: Viewpoint[] = [];
      for (const ref of parsed.viewpointRefs) {
        const vpXml = await zip.file(`${folder}/${ref.file}`)?.async("string");
        const snapshotFile = ref.snapshot ?? "snapshot.png";
        const snapshotData = await zip.file(`${folder}/${snapshotFile}`)?.async("uint8array");
        if (!vpXml) {
          warnings.push(`Не найден viewpoint файл ${ref.file} для ${folder}`);
          continue;
        }
        const vp = parseViewpoint(vpXml, fromBuffer(snapshotData));
        vp.guid = ref.guid || vp.guid;
        vp.snapshotFileName = snapshotData ? snapshotFile : undefined;
        viewpoints.push(vp);
      }
      topics.push({
        guid: parsed.guid ?? guid(),
        number: number++,
        title: parsed.title ?? "Без названия",
        description: parsed.description ?? "",
        status: (parsed.status as IssueTopic["status"]) ?? "Активная",
        priority: (parsed.priority as IssueTopic["priority"]) ?? "Обычный",
        type: (parsed.type as IssueTopic["type"]) ?? "Замечание",
        labels: parsed.labels ?? [],
        assignedTo: parsed.assignedTo,
        area: parsed.labels?.[0],
        milestone: undefined,
        deadline: parsed.deadline,
        creationAuthor: parsed.creationAuthor ?? "unknown",
        creationDate: parsed.creationDate ?? new Date().toISOString(),
        modifiedAuthor: parsed.modifiedAuthor,
        modifiedDate: parsed.modifiedDate,
        comments: parsed.comments ?? [],
        viewpoints
      });
    }
    return {
      project: { projectId: project.projectId, name: project.name, topics, importVersion: version, exportVersion: version },
      detectedVersion: version,
      container: ".bcfzip",
      warnings
    };
  }
}
