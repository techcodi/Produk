import { ToolPage } from "@/components/tools/tool-page";
import { getTool } from "@/config/tools";
import { WordToPdfTool } from "@/features/word-to-pdf";
import { toolMetadata } from "@/lib/metadata";

const tool = getTool("word-to-pdf");

export const metadata = toolMetadata(tool);

export default function WordToPdfPage() {
  return (
    <ToolPage tool={tool}>
      <WordToPdfTool />
    </ToolPage>
  );
}
