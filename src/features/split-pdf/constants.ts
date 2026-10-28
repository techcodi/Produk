import type { SplitSettings } from "./types";

export const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;

export const DEFAULT_SETTINGS: SplitSettings = {
  mode: "select",
  ranges: "",
  everyN: "1",
};
