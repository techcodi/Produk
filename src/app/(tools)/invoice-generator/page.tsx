import { ToolPage } from "@/components/tools/tool-page";
import { getTool } from "@/config/tools";
import { InvoiceGeneratorTool } from "@/features/invoice-generator";
import { toolMetadata } from "@/lib/metadata";

const tool = getTool("invoice-generator");

export const metadata = toolMetadata(tool);

export default function InvoiceGeneratorPage() {
  return (
    <ToolPage tool={tool}>
      <InvoiceGeneratorTool />
    </ToolPage>
  );
}
