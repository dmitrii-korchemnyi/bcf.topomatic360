import type { TopomaticContext } from "../topomatic/albatros-types";

let currentStatus = "Все";
const statuses = ["Все", "Открыто", "В работе", "Решено", "Закрыто"];

export async function get_bcf_statuses(): Promise<string[]> {
  return statuses;
}

export function get_current_bcf_status(): string {
  return currentStatus;
}

export async function set_current_bcf_status(ctx: TopomaticContext): Promise<void> {
  if (typeof ctx.value === "string") {
    currentStatus = ctx.value;
    ctx.manager?.broadcast?.("bcf:changed", { source: "filter", status: currentStatus });
  }
}
