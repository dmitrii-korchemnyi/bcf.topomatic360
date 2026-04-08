import { createService } from "../core/shared";

export async function bcf_open_browser(ctx: Context): Promise<void> {
  await createService(ctx).openBrowser();
}

export async function bcf_import_archive(ctx: Context): Promise<void> {
  await createService(ctx).importArchive();
}

export async function bcf_export_archive(ctx: Context): Promise<void> {
  await createService(ctx).exportArchive();
}

export async function bcf_create_topic(ctx: Context): Promise<void> {
  await createService(ctx).createTopic();
}

export async function bcf_edit_topic(ctx: Context): Promise<void> {
  await createService(ctx).editTopicFromContext();
}

export async function bcf_open_topic(ctx: Context): Promise<void> {
  await createService(ctx).openTopicFromContext();
}

export async function bcf_quick_list(ctx: Context): Promise<void> {
  await createService(ctx).openQuickList();
}

export async function bcf_add_comment(ctx: Context): Promise<void> {
  await createService(ctx).addCommentFromContext();
}

export async function bcf_refresh_tree(ctx: Context): Promise<void> {
  await createService(ctx).refresh();
}

export async function bcf_delete_topic(ctx: Context): Promise<void> {
  await createService(ctx).deleteTopicFromContext();
}

export async function bcf_resolve_topic(ctx: Context): Promise<void> {
  await createService(ctx).resolveTopicFromContext();
}

export async function bcf_close_topic(ctx: Context): Promise<void> {
  await createService(ctx).closeTopicFromContext();
}

export async function bcf_reopen_topic(ctx: Context): Promise<void> {
  await createService(ctx).reopenTopicFromContext();
}

export async function bcf_debug_context(ctx: Context): Promise<void> {
  await createService(ctx).debugContext();
}
