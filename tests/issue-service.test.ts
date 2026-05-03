import { describe, expect, it } from "vitest";
import { createIssue, isClosedIssue } from "../src/application/issue-service";

describe("issue-service", () => {
  it("creates issue with component selection", () => {
    const issue = createIssue({
      title: "Новая проблема",
      author: "Tester",
      components: [{ ifcGuid: "abc" }]
    });

    expect(issue.title).toBe("Новая проблема");
    expect(issue.viewpoints[0].components.selection[0].ifcGuid).toBe("abc");
    expect(isClosedIssue(issue)).toBe(false);
  });
});
