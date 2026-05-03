import * as commands from "./commands";
import * as providers from "./providers";
import { mount_bcf_panel } from "./ui/mount-bcf-panel";

export default {
  ...commands,
  ...providers,
  mount_bcf_panel
};
