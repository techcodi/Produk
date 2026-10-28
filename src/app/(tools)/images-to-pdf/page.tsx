import { ToolPage } from "@/components/tools/tool-page";
import { getTool } from "@/config/tools";
import { ImagesToPdfTool } from "@/features/images-to-pdf";
import { toolMetadata } from "@/lib/metadata";

const tool = getTool("images-to-pdf");

export const metadata = toolMetadata(tool);

export default function ImagesToPdfPage() {
  return (
    <ToolPage tool={tool}>
      <ImagesToPdfTool />
    </ToolPage>
  );
}
