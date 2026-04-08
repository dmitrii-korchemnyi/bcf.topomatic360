import { BcfService } from "../application/BcfService";
import { BcfZipReader } from "../bcf/BcfZipReader";
import { BcfZipWriter } from "../bcf/BcfZipWriter";
import { InMemoryTopicStore } from "../infrastructure/InMemoryTopicStore";
import { TopomaticAdapter } from "../topomatic/TopomaticAdapter";

const sharedStore = new InMemoryTopicStore();
const sharedReader = new BcfZipReader();
const sharedWriter = new BcfZipWriter();

export function createService(ctx: Context): BcfService {
  const adapter = new TopomaticAdapter(ctx);
  return new BcfService(sharedStore, sharedReader, sharedWriter, adapter, adapter);
}
