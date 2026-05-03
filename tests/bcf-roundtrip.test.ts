import { describe, expect, it } from "vitest";
import { parseBcfZip } from "../src/bcf/parser";
import { serializeBcfZip } from "../src/bcf/serializer";
import type { BcfVersion } from "../src/domain/model";
import { createFixtureProject } from "./fixtures";

describe.each<BcfVersion>(["2.0", "2.1", "3.0"])("bcf%s-roundtrip", (version) => {
  it("imports exported archive without losing core issue data", async () => {
    const source = createFixtureProject(version);
    const archive = await serializeBcfZip(source, version);
    const parsed = await parseBcfZip(archive);

    expect(parsed.sourceVersion).toBe(version);
    expect(parsed.name).toBe(source.name);
    expect(parsed.issues).toHaveLength(1);
    expect(parsed.issues[0].title).toBe(source.issues[0].title);
    expect(parsed.issues[0].comments[0].text).toBe("Комментарий");
    expect(parsed.issues[0].viewpoints[0].snapshot?.data.length).toBe(4);
    expect(parsed.issues[0].viewpoints[0].components.selection[0].ifcGuid).toBe("0BTBFw6f90Nfh9rP1dlXr4");
  });
});
