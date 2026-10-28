import { ToolPage } from "@/components/tools/tool-page";
import { getTool } from "@/config/tools";
import { QrCodeTool } from "@/features/qr-code-generator";
import { toolMetadata } from "@/lib/metadata";

const tool = getTool("qr-code-generator");

export const metadata = toolMetadata(tool);

export default function QrCodeGeneratorPage() {
  return (
    <ToolPage tool={tool}>
      <QrCodeTool />
    </ToolPage>
  );
}
