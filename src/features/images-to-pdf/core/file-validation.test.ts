import { describe, expect, it } from "vitest";
import { MAX_FILE_SIZE_BYTES, MAX_FILES } from "../constants";
import { partitionFiles, toPdfFileName } from "./file-validation";

const file = (name: string, type = "", size = 10) => {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
};

describe("partitionFiles", () => {
  it("rejects unsupported, oversized and over-limit files with reasons", () => {
    const { accepted, rejected } = partitionFiles(
      [file("ok.png", "image/png"), file("x.txt", "text/plain"), file("big.jpg", "image/jpeg", MAX_FILE_SIZE_BYTES + 1)],
      0,
    );
    expect(accepted.map((f) => f.name)).toEqual(["ok.png"]);
    expect(rejected).toHaveLength(2);
  });

  it("enforces the file limit against what is already added", () => {
    const { accepted, rejected } = partitionFiles([file("a.png", "image/png"), file("b.png", "image/png")], MAX_FILES - 1);
    expect(accepted).toHaveLength(1);
    expect(rejected[0].reason).toMatch(/limit/i);
  });
});

describe("toPdfFileName", () => {
  it("sanitises and appends the extension once", () => {
    expect(toPdfFileName("  My scans.pdf ")).toBe("My scans.pdf");
    expect(toPdfFileName('a/b:c*?"d')).toBe("a-b-c-d.pdf");
    expect(toPdfFileName("   ")).toBe("produk-images.pdf");
  });
});
