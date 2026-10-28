import { ToolPage } from "@/components/tools/tool-page";
import { getTool } from "@/config/tools";
import { SplitPdfTool } from "@/features/split-pdf";
import { toolMetadata } from "@/lib/metadata";

const tool = getTool("split-pdf");

export const metadata = toolMetadata(tool);

export default function SplitPdfPage() {
  return (
    <ToolPage tool={tool}>
      <SplitPdfTool />
    </ToolPage>
  );
}
