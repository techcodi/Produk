/** True when this browser can hand a file of `type` to the system share sheet (WhatsApp, Mail, Drive…). */
export function canShareFile(type: string, sampleName: string): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [new File([""], sampleName, { type })] });
  } catch {
    return false;
  }
}

/** Opens the share sheet. Resolves false when the user closed it without picking anything. */
export async function shareFile(file: File, details: { title?: string; text?: string } = {}): Promise<boolean> {
  try {
    await navigator.share({ files: [file], ...details });
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return false;
    throw error;
  }
}
