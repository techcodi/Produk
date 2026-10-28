import { ToolPage } from "@/components/tools/tool-page";
import { getTool } from "@/config/tools";
import { CardMakerTool } from "@/features/card-maker";
import { toolMetadata } from "@/lib/metadata";

const tool = getTool("card-maker");

export const metadata = toolMetadata(tool);

export default function CardMakerPage() {
  return (
    <ToolPage tool={tool}>
      <CardMakerTool />
    </ToolPage>
  );
}
