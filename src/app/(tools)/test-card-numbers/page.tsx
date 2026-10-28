import { ToolPage } from "@/components/tools/tool-page";
import { getTool } from "@/config/tools";
import { TestCardNumbersTool } from "@/features/test-card-numbers";
import { toolMetadata } from "@/lib/metadata";

const tool = getTool("test-card-numbers");

export const metadata = toolMetadata(tool);

export default function TestCardNumbersPage() {
  return (
    <ToolPage tool={tool}>
      <TestCardNumbersTool />
    </ToolPage>
  );
}
