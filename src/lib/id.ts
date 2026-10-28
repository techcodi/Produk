let counter = 0;

/**
 * `crypto.randomUUID` only exists in secure contexts, so it is missing when the
 * dev server is opened from a phone over a LAN IP. Fall back gracefully.
 */
export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  counter += 1;
  return `${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}
