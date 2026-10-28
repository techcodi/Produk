import { describe, expect, it } from "vitest";
import { extensionOf, partitionFiles, sanitizeFileName, stripExtension, uniqueFileNames } from "./files";

const file = (name: string, type = "", size = 10) => {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
};

describe("extensionOf / stripExtension", () => {
  it("handles multiple dots and dotfiles", () => {
    expect(extensionOf("a.b.JPG")).toBe(".jpg");
    expect(extensionOf(".hidden")).toBe("");
    expect(stripExtension("holiday.photo.jpg")).toBe("holiday.photo");
    expect(stripExtension("README")).toBe("README");
  });
});

describe("sanitizeFileName", () => {
  it("sanitises and appends the extension once", () => {
    expect(sanitizeFileName("  My scans.PDF ", "pdf", "x")).toBe("My scans.pdf");
    expect(sanitizeFileName('a/b:c*?"d', ".zip", "x")).toBe("a-b-c-d.zip");
    expect(sanitizeFileName("   ", "pdf", "fallback")).toBe("fallback.pdf");
  });
});

describe("uniqueFileNames", () => {
  it("numbers duplicates case-insensitively", () => {
    expect(uniqueFileNames(["a.jpg", "b.jpg", "A.jpg", "a.jpg"])).toEqual(["a.jpg", "b.jpg", "A (2).jpg", "a (3).jpg"]);
  });
});

describe("partitionFiles", () => {
  const options = { isAccepted: (f: File) => f.name.endsWith(".pdf"), typeError: "Not a PDF", maxFiles: 2, maxFileSize: 100, noun: "files" };

  it("rejects wrong types, oversized files and anything past the limit", () => {
    const { accepted, rejected } = partitionFiles([file("a.pdf"), file("b.txt"), file("c.pdf", "", 101), file("d.pdf"), file("e.pdf")], 0, options);
    expect(accepted.map((f) => f.name)).toEqual(["a.pdf", "d.pdf"]);
    expect(rejected.map((r) => r.reason)).toEqual(["Not a PDF", "Larger than 100 B", "Limit of 2 files reached"]);
  });
});
