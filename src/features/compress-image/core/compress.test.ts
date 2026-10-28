import { describe, expect, it } from "vitest";
import { chooseOutputMime, compressedFileName, shouldKeepOriginal } from "./compress";

describe("chooseOutputMime", () => {
  it("uses JPEG for opaque images and WebP for transparent ones in auto mode", () => {
    expect(chooseOutputMime("auto", false)).toBe("image/jpeg");
    expect(chooseOutputMime("auto", true)).toBe("image/webp");
  });

  it("respects an explicit format", () => {
    expect(chooseOutputMime("jpeg", true)).toBe("image/jpeg");
    expect(chooseOutputMime("webp", false)).toBe("image/webp");
  });
});

describe("shouldKeepOriginal", () => {
  it("keeps web-format originals that are already smaller", () => {
    expect(shouldKeepOriginal({ type: "image/png", size: 100 }, 150)).toBe(true);
    expect(shouldKeepOriginal({ type: "image/jpeg", size: 200 }, 150)).toBe(false);
  });

  it("never hands back formats other apps struggle with", () => {
    expect(shouldKeepOriginal({ type: "image/heic", size: 100 }, 150)).toBe(false);
    expect(shouldKeepOriginal({ type: "", size: 100 }, 150)).toBe(false);
  });
});

describe("compressedFileName", () => {
  it("swaps the extension for the actual output type", () => {
    expect(compressedFileName("IMG_0001.HEIC", "image/jpeg")).toBe("IMG_0001-compressed.jpg");
    expect(compressedFileName("logo.png", "image/webp")).toBe("logo-compressed.webp");
  });
});
