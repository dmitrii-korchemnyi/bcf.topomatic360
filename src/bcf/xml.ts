import { XMLParser } from "fast-xml-parser";
import { create } from "xmlbuilder2";

export const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true
});

export function buildXml(document: Record<string, unknown>): string {
  return create({ version: "1.0", encoding: "UTF-8" }, document).end({ prettyPrint: true });
}

export function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function text(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (isRecord(value) && typeof value["#text"] === "string") {
    return value["#text"];
  }

  return undefined;
}

export function attr(value: unknown, name: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const result = value[`@_${name}`];
  return typeof result === "string" ? result : undefined;
}

export function node(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
