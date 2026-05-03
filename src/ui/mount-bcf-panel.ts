import type { TopomaticContext } from "../topomatic/albatros-types";
import { renderBcfPanel } from "./panel";

export async function mount_bcf_panel(ctx: TopomaticContext): Promise<void> {
  if (!ctx.el) {
    ctx.showMessage("Ошибка: контейнер BCF Manager недоступен", "error");
    return;
  }

  ctx.el.innerHTML = "";
  const mountPoint = document.createElement("div");
  ctx.el.append(mountPoint);
  renderBcfPanel(mountPoint);
}
