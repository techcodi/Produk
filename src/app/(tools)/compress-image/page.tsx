import { ToolPage } from "@/components/tools/tool-page";
import { getTool } from "@/config/tools";
import { CompressImageTool } from "@/features/compress-image";
import { toolMetadata } from "@/lib/metadata";

const tool = getTool("compress-image");

export const metadata = toolMetadata(tool);

export default function CompressImagePage() {
  return (
    <ToolPage tool={tool}>
      <CompressImageTool />
    </ToolPage>
  );
}
