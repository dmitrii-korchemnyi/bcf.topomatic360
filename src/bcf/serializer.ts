import JSZip from "jszip";
import type { BcfVersion, InternalBcfComponentRef, InternalBcfProject, InternalBcfViewpoint, InternalBcfIssue, InternalBcfPoint } from "../domain/model";
import { buildXml } from "./xml";

export async function serializeBcfZip(project: InternalBcfProject, version: BcfVersion): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("bcf.version", buildXml({ Version: { "@VersionId": version } }));
  zip.file("project.bcfp", buildProject(project));

  for (const issue of project.issues) {
    const dir = zip.folder(issue.guid);
    if (!dir) {
      continue;
    }

    dir.file("markup.bcf", buildMarkup(issue));
    for (const viewpoint of issue.viewpoints) {
      dir.file(viewpoint.filename, buildViewpoint(viewpoint));
      if (viewpoint.snapshot) {
        dir.file(viewpoint.snapshot.filename, viewpoint.snapshot.data);
      }
    }
  }

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

function buildProject(project: InternalBcfProject): string {
  return buildXml({
    ProjectExtension: {
      Project: {
        "@ProjectId": project.projectId,
        Name: project.name
      }
    }
  });
}

function buildMarkup(issue: InternalBcfIssue): string {
  return buildXml({
    Markup: {
      Topic: {
        "@Guid": issue.guid,
        ...(issue.displayId ? { "@Index": issue.displayId } : {}),
        ...(issue.serverAssignedId ? { "@ServerAssignedId": issue.serverAssignedId } : {}),
        TopicType: issue.type,
        TopicStatus: issue.status,
        Title: issue.title,
        ...(issue.description ? { Description: issue.description } : {}),
        ...(issue.priority ? { Priority: issue.priority } : {}),
        ...(issue.assignedTo ? { AssignedTo: issue.assignedTo } : {}),
        ...(issue.labels?.length ? { Labels: { Label: issue.labels } } : {}),
        ...(issue.stage ? { Stage: issue.stage } : {}),
        ...(issue.dueDate ? { DueDate: issue.dueDate } : {}),
        CreationDate: issue.creationDate,
        CreationAuthor: issue.creationAuthor,
        ...(issue.modifiedDate ? { ModifiedDate: issue.modifiedDate } : {}),
        ...(issue.modifiedAuthor ? { ModifiedAuthor: issue.modifiedAuthor } : {})
      },
      Viewpoints: issue.viewpoints.map((viewpoint) => ({
        "@Guid": viewpoint.guid,
        Viewpoint: viewpoint.filename,
        ...(viewpoint.snapshot ? { Snapshot: viewpoint.snapshot.filename } : {})
      })),
      Comment: issue.comments.map((comment) => ({
        "@Guid": comment.guid,
        Date: comment.date,
        Author: comment.author,
        Comment: comment.text,
        ...(comment.viewpointGuid ? { Viewpoint: { "@Guid": comment.viewpointGuid } } : {}),
        ...(comment.modifiedDate ? { ModifiedDate: comment.modifiedDate } : {}),
        ...(comment.modifiedAuthor ? { ModifiedAuthor: comment.modifiedAuthor } : {})
      }))
    }
  });
}

function buildViewpoint(viewpoint: InternalBcfViewpoint): string {
  return buildXml({
    VisualizationInfo: {
      "@Guid": viewpoint.guid,
      ...(viewpoint.perspectiveCamera ? { PerspectiveCamera: buildPerspectiveCamera(viewpoint.perspectiveCamera) } : {}),
      ...(viewpoint.orthogonalCamera ? { OrthogonalCamera: buildOrthogonalCamera(viewpoint.orthogonalCamera) } : {}),
      Components: buildComponents(viewpoint),
      ...(viewpoint.clippingPlanes.length ? {
        ClippingPlanes: {
          ClippingPlane: viewpoint.clippingPlanes.map((plane) => ({
            Location: buildPoint(plane.location),
            Direction: buildPoint(plane.direction)
          }))
        }
      } : {}),
      ...(viewpoint.snapshot ? { Snapshot: viewpoint.snapshot.filename } : {})
    }
  });
}

function buildPerspectiveCamera(camera: NonNullable<InternalBcfViewpoint["perspectiveCamera"]>): Record<string, unknown> {
  return {
    CameraViewPoint: buildPoint(camera.cameraViewPoint),
    CameraDirection: buildPoint(camera.cameraDirection),
    CameraUpVector: buildPoint(camera.cameraUpVector),
    FieldOfView: camera.fieldOfView,
    ...(camera.aspectRatio ? { AspectRatio: camera.aspectRatio } : {})
  };
}

function buildOrthogonalCamera(camera: NonNullable<InternalBcfViewpoint["orthogonalCamera"]>): Record<string, unknown> {
  return {
    CameraViewPoint: buildPoint(camera.cameraViewPoint),
    CameraDirection: buildPoint(camera.cameraDirection),
    CameraUpVector: buildPoint(camera.cameraUpVector),
    ViewToWorldScale: camera.viewToWorldScale,
    ...(camera.aspectRatio ? { AspectRatio: camera.aspectRatio } : {})
  };
}

function buildPoint(point: InternalBcfPoint): Record<string, number> {
  return { X: point.x, Y: point.y, Z: point.z };
}

function buildComponents(viewpoint: InternalBcfViewpoint): Record<string, unknown> {
  return {
    Selection: { Component: viewpoint.components.selection.map(buildComponentRef) },
    Visibility: {
      DefaultVisibility: String(viewpoint.components.visibility.defaultVisibility),
      Exceptions: { Component: viewpoint.components.visibility.exceptions.map(buildComponentRef) }
    },
    Coloring: {
      Color: viewpoint.components.coloring.map((entry) => ({
        "@Color": entry.color,
        Component: entry.components.map(buildComponentRef)
      }))
    }
  };
}

function buildComponentRef(component: InternalBcfComponentRef): Record<string, string> {
  return {
    ...(component.ifcGuid ? { "@IfcGuid": component.ifcGuid } : {}),
    ...(component.originatingSystem ? { "@OriginatingSystem": component.originatingSystem } : {}),
    ...(component.authoringToolId ? { "@AuthoringToolId": component.authoringToolId } : {})
  };
}
