import { ToolPage } from "@/components/tools/tool-page";
import { getTool } from "@/config/tools";
import { PassportPhotoTool } from "@/features/passport-photo";
import { toolMetadata } from "@/lib/metadata";

const tool = getTool("passport-photo");

export const metadata = toolMetadata(tool);

export default function PassportPhotoPage() {
  return (
    <ToolPage tool={tool}>
      <PassportPhotoTool />
    </ToolPage>
  );
}
