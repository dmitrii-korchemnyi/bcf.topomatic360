import { BcfService } from "./application/BcfService";
import { BcfValidator, BcfZipReader, BcfZipWriter } from "./bcf/BcfEngine";
import { createCommands } from "./commands";
import { PersistentTopicStore } from "./infrastructure/PersistentTopicStore";
import { buildTopicTreeProvider } from "./providers/topicTreeProvider";
import { TopomaticAdapter } from "./topomatic/TopomaticAdapter";

function makeService(ctx: Context): BcfService {
  const settings = ctx.extension.settings("ru.dkorchemnyi.topomatic360.bcf");
  const adapter = new TopomaticAdapter(ctx, settings);
  return new BcfService(
    new PersistentTopicStore(settings),
    new BcfZipReader(),
    new BcfZipWriter(),
    new BcfValidator(),
    adapter,
    adapter
  );
}

export default {
  async "bcf:open-manager"(ctx: Context) { return createCommands(makeService(ctx))["bcf:open-manager"](ctx); },
  async "bcf:create-topic"(ctx: Context) { return createCommands(makeService(ctx))["bcf:create-topic"](ctx); },
  async "bcf:import"(ctx: Context) { return createCommands(makeService(ctx))["bcf:import"](ctx); },
  async "bcf:export"(ctx: Context) { return createCommands(makeService(ctx))["bcf:export"](ctx); },
  async "bcf:edit-selected-topic"(ctx: Context) { return createCommands(makeService(ctx))["bcf:edit-selected-topic"](ctx); },
  async "bcf:focus-selected-topic"(ctx: Context) { return createCommands(makeService(ctx))["bcf:focus-selected-topic"](ctx); },
  async "bcf:delete-selected-topic"(ctx: Context) { return createCommands(makeService(ctx))["bcf:delete-selected-topic"](ctx); },
  async "bcf:add-comment-selected-topic"(ctx: Context) { return createCommands(makeService(ctx))["bcf:add-comment-selected-topic"](ctx); },
  async "bcf:set-status-resolved"(ctx: Context) { return createCommands(makeService(ctx))["bcf:set-status-resolved"](ctx); },
  async "bcf:set-status-closed"(ctx: Context) { return createCommands(makeService(ctx))["bcf:set-status-closed"](ctx); },
  async "bcf:set-status-reopened"(ctx: Context) { return createCommands(makeService(ctx))["bcf:set-status-reopened"](ctx); },
  async "bcf:about"(ctx: Context) { return createCommands(makeService(ctx))["bcf:about"](ctx); },
  "bcf:build-tree"(ctx: Context) { return buildTopicTreeProvider(makeService(ctx))(ctx); }
};
