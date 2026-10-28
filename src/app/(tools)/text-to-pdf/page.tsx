import { ToolPage } from "@/components/tools/tool-page";
import { getTool } from "@/config/tools";
import { TextToPdfTool } from "@/features/text-to-pdf";
import { toolMetadata } from "@/lib/metadata";

const tool = getTool("text-to-pdf");

export const metadata = toolMetadata(tool);

export default function TextToPdfPage() {
  return (
    <ToolPage tool={tool}>
      <TextToPdfTool />
    </ToolPage>
  );
}
