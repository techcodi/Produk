import { ToolPage } from "@/components/tools/tool-page";
import { getTool } from "@/config/tools";
import { PdfToImagesTool } from "@/features/pdf-to-images";
import { toolMetadata } from "@/lib/metadata";

const tool = getTool("pdf-to-images");

export const metadata = toolMetadata(tool);

export default function PdfToImagesPage() {
  return (
    <ToolPage tool={tool}>
      <PdfToImagesTool />
    </ToolPage>
  );
}
