import type { BcfVersion, InternalBcfProject } from "../src/domain/model";
import { createGuid } from "../src/utils/ids";

export function createFixtureProject(version: BcfVersion = "3.0"): InternalBcfProject {
  const issueGuid = createGuid();
  const viewpointGuid = createGuid();
  return {
    projectId: createGuid(),
    name: `Roundtrip ${version}`,
    sourceVersion: version,
    issues: [
      {
        guid: issueGuid,
        displayId: "ISSUE-001",
        title: "Проверка BCF",
        description: "Roundtrip description",
        status: "Открыто",
        type: "Замечание",
        priority: "Высокий",
        assignedTo: "qa@example.com",
        labels: ["QA"],
        stage: "v1",
        dueDate: "2026-05-10",
        creationDate: "2026-05-03T10:00:00.000Z",
        creationAuthor: "Codex",
        comments: [
          {
            guid: createGuid(),
            author: "Codex",
            date: "2026-05-03T10:01:00.000Z",
            text: "Комментарий",
            viewpointGuid
          }
        ],
        viewpoints: [
          {
            guid: viewpointGuid,
            index: 0,
            filename: "viewpoint.bcfv",
            snapshot: {
              filename: "snapshot.png",
              mimeType: "image/png",
              data: new Uint8Array([137, 80, 78, 71])
            },
            perspectiveCamera: {
              cameraViewPoint: { x: 1, y: 2, z: 3 },
              cameraDirection: { x: 0, y: 0, z: -1 },
              cameraUpVector: { x: 0, y: 1, z: 0 },
              fieldOfView: 60,
              aspectRatio: 1.77
            },
            components: {
              selection: [{ ifcGuid: "0BTBFw6f90Nfh9rP1dlXr4", originatingSystem: "Topomatic 360", authoringToolId: "42" }],
              visibility: {
                defaultVisibility: true,
                exceptions: []
              },
              coloring: [
                {
                  color: "#ff0000",
                  components: [{ ifcGuid: "0BTBFw6f90Nfh9rP1dlXr4" }]
                }
              ]
            },
            clippingPlanes: [
              {
                location: { x: 0, y: 0, z: 0 },
                direction: { x: 1, y: 0, z: 0 }
              }
            ]
          }
        ]
      }
    ]
  };
}
