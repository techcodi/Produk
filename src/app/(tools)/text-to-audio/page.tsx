import { ToolPage } from "@/components/tools/tool-page";
import { getTool } from "@/config/tools";
import { TextToAudioTool } from "@/features/text-to-audio";
import { toolMetadata } from "@/lib/metadata";

const tool = getTool("text-to-audio");

export const metadata = toolMetadata(tool);

export default function TextToAudioPage() {
  return (
    <ToolPage tool={tool}>
      <TextToAudioTool />
    </ToolPage>
  );
}
