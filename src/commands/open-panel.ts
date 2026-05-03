import type { TopomaticContext } from "../topomatic/albatros-types";

export async function open_bcf_panel(ctx: TopomaticContext): Promise<void> {
  ctx.manager?.broadcast?.("bcf:open-panel");
  ctx.showMessage("BCF Manager открыт в боковой панели", "info");
}
