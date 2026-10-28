import { ToolPage } from "@/components/tools/tool-page";
import { getTool } from "@/config/tools";
import { ResizeImageTool } from "@/features/resize-image";
import { toolMetadata } from "@/lib/metadata";

const tool = getTool("resize-image");

export const metadata = toolMetadata(tool);

export default function ResizeImagePage() {
  return (
    <ToolPage tool={tool}>
      <ResizeImageTool />
    </ToolPage>
  );
}
