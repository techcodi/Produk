import { ToolPage } from "@/components/tools/tool-page";
import { getTool } from "@/config/tools";
import { MergePdfTool } from "@/features/merge-pdf";
import { toolMetadata } from "@/lib/metadata";

const tool = getTool("merge-pdf");

export const metadata = toolMetadata(tool);

export default function MergePdfPage() {
  return (
    <ToolPage tool={tool}>
      <MergePdfTool />
    </ToolPage>
  );
}
