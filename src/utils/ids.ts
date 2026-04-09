export function guid(): string {
  const c: Crypto | undefined = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (s) => {
    const r = Math.random() * 16 | 0;
    const v = s === "x" ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
}
