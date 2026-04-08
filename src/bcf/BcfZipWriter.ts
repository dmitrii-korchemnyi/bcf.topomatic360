import JSZip from "jszip";
import { ArchiveWriter } from "../domain/contracts";
import { BcfVersion, IssueProject } from "../domain/model";
import { buildMarkupXml, buildProjectXml, buildVersionXml, buildViewpointXml } from "./BcfXml";

export class BcfZipWriter implements ArchiveWriter {
  async write(project: IssueProject, version: BcfVersion): Promise<Uint8Array> {
    const zip = new JSZip();
    zip.file("bcf.version", buildVersionXml(version));
    zip.file("project.bcfp", buildProjectXml(project.projectId, project.name, version));

    for (const topic of project.topics) {
      const folder = zip.folder(topic.guid)!;
      for (const viewpoint of topic.viewpoints) {
        folder.file(`${viewpoint.guid}.bcfv`, buildViewpointXml(viewpoint, version));
        if (viewpoint.snapshotBase64) {
          const pngName = viewpoint.snapshotFileName || `${viewpoint.guid}.png`;
          folder.file(pngName, viewpoint.snapshotBase64, { base64: true });
          viewpoint.snapshotFileName = pngName;
        }
      }
      folder.file("markup.bcf", buildMarkupXml(topic, version));
    }

    return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  }
}
