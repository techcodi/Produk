import { ToolPage } from "@/components/tools/tool-page";
import { getTool } from "@/config/tools";
import { EditPdfTool } from "@/features/edit-pdf";
import { toolMetadata } from "@/lib/metadata";

const tool = getTool("edit-pdf");

export const metadata = toolMetadata(tool);

export default function EditPdfPage() {
  return (
    <ToolPage tool={tool}>
      <EditPdfTool />
    </ToolPage>
  );
}
