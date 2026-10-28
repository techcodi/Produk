import { ToolPage } from "@/components/tools/tool-page";
import { getTool } from "@/config/tools";
import { RemoveBackgroundTool } from "@/features/remove-background";
import { toolMetadata } from "@/lib/metadata";

const tool = getTool("remove-background");

export const metadata = toolMetadata(tool);

export default function RemoveBackgroundPage() {
  return (
    <ToolPage tool={tool}>
      <RemoveBackgroundTool />
    </ToolPage>
  );
}
