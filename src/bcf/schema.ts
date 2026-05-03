import { z } from "zod";

export const bcfVersionSchema = z.union([z.literal("2.0"), z.literal("2.1"), z.literal("3.0")]);

export const pointSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number()
});

export const componentRefSchema = z.object({
  ifcGuid: z.string().optional(),
  originatingSystem: z.string().optional(),
  authoringToolId: z.string().optional()
});

export const issueSchema = z.object({
  guid: z.string().min(1),
  title: z.string().min(1),
  status: z.string().min(1),
  type: z.string().min(1),
  creationDate: z.string().min(1),
  creationAuthor: z.string().min(1)
});
