import { describe, expect, it } from "vitest";
import { validateProject } from "../src/bcf/validator";
import { createFixtureProject } from "./fixtures";

describe("export-validation", () => {
  it("blocks issue without title", () => {
    const project = createFixtureProject();
    project.issues[0].title = "";

    const validation = validateProject(project);

    expect(validation.errors.some((message) => message.code === "topic.title")).toBe(true);
  });
});
