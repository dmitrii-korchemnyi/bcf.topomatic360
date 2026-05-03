import type { TopomaticContext } from "../topomatic/albatros-types";
import { updateStatusBar } from "../application/status-service";

export async function on_window_changed(ctx: TopomaticContext): Promise<void> {
  updateStatusBar(ctx);
  ctx.manager?.broadcast?.("bcf:changed", { source: "window" });
}

export async function on_selection_changed(ctx: TopomaticContext): Promise<void> {
  ctx.manager?.broadcast?.("bcf:selection-changed");
}
