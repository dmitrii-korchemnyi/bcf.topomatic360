import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { parseBcfZip } from "../src/bcf/parser";

describe("import-invalid-bcf", () => {
  it("blocks archive without bcf.version", async () => {
    const zip = new JSZip();
    zip.file("project.bcfp", "<ProjectExtension />");
    const data = await zip.generateAsync({ type: "uint8array" });

    await expect(parseBcfZip(data)).rejects.toThrow("Ошибка: отсутствует bcf.version");
  });
});
