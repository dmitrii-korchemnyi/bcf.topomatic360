import type { TopomaticContext } from "./albatros-types";
import { BcfUserError } from "../utils/errors";

type ReadableDialogResult = Blob | ArrayBuffer | Uint8Array | { file?: Blob } | { data?: ArrayBuffer | Uint8Array } | { read?: () => Promise<ArrayBuffer | Uint8Array> };
type WritableDialogResult = { write?: (data: Uint8Array) => Promise<void> | void } | { file?: { write?: (data: Uint8Array) => Promise<void> | void } };

export async function openBcfZipBytes(ctx: TopomaticContext): Promise<Uint8Array> {
  const result = await ctx.openDialog({
    title: "Выберите BCF-файл",
    filters: [{ name: "BCF", extensions: ["bcfzip"] }]
  });

  if (!result) {
    throw new BcfUserError("Импорт отменён");
  }

  return readDialogResult(result as ReadableDialogResult);
}

export async function saveBcfZipBytes(ctx: TopomaticContext, data: Uint8Array): Promise<void> {
  const result = await ctx.saveDialog({
    title: "Сохранить BCF",
    filters: [{ name: "BCF", extensions: ["bcfzip"] }]
  });

  if (!result) {
    throw new BcfUserError("Экспорт отменён");
  }

  await writeDialogResult(result as WritableDialogResult, data);
}

async function readDialogResult(result: ReadableDialogResult): Promise<Uint8Array> {
  if (result instanceof Uint8Array) {
    return result;
  }

  if (result instanceof ArrayBuffer) {
    return new Uint8Array(result);
  }

  if (result instanceof Blob) {
    return new Uint8Array(await result.arrayBuffer());
  }

  if ("file" in result && result.file instanceof Blob) {
    return new Uint8Array(await result.file.arrayBuffer());
  }

  if ("data" in result && result.data) {
    return result.data instanceof Uint8Array ? result.data : new Uint8Array(result.data);
  }

  if ("read" in result && typeof result.read === "function") {
    const data = await result.read();
    return data instanceof Uint8Array ? data : new Uint8Array(data);
  }

  throw new BcfUserError("Ошибка: невозможно прочитать выбранный BCF-файл. VERIFY_ALBATROS_API: уточнить формат результата ctx.openDialog.");
}

async function writeDialogResult(result: WritableDialogResult, data: Uint8Array): Promise<void> {
  if ("write" in result && typeof result.write === "function") {
    await result.write(data);
    return;
  }

  if ("file" in result && result.file && typeof result.file.write === "function") {
    await result.file.write(data);
    return;
  }

  throw new BcfUserError("Ошибка: невозможно сохранить BCF-файл. VERIFY_ALBATROS_API: уточнить формат результата ctx.saveDialog без saveBinary.");
}
