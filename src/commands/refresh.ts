import type { TopomaticContext } from "../topomatic/albatros-types";
import { updateStatusBar } from "../application/status-service";

export async function refresh_bcf(ctx: TopomaticContext): Promise<void> {
  updateStatusBar(ctx);
  ctx.manager?.broadcast?.("bcf:changed", { source: "refresh" });
  ctx.showMessage("BCF Manager обновлён", "info");
}
