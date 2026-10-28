import { ToolPage } from "@/components/tools/tool-page";
import { getTool } from "@/config/tools";
import { BusinessCardTool } from "@/features/business-card-maker";
import { toolMetadata } from "@/lib/metadata";

const tool = getTool("business-card-maker");

export const metadata = toolMetadata(tool);

export default function BusinessCardMakerPage() {
  return (
    <ToolPage tool={tool}>
      <BusinessCardTool />
    </ToolPage>
  );
}
