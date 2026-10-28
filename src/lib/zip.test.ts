import { describe, expect, it } from "vitest";
import { crc32, createZip } from "./zip";

const bytes = (text: string) => new TextEncoder().encode(text);

describe("crc32", () => {
  it("matches the standard check value", () => {
    expect(crc32(bytes("123456789"))).toBe(0xcbf43926);
  });
});

describe("createZip", () => {
  it("writes stored entries that can be read back from the central directory", () => {
    const zip = createZip([
      { name: "a.txt", data: bytes("hello") },
      { name: "folder/ü.txt", data: bytes("world!") },
    ]);
    const view = new DataView(zip.buffer);

    expect(view.getUint32(0, true)).toBe(0x04034b50);

    const end = zip.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);

    // Walk the central directory and pull each file's bytes out via its local header.
    let cursor = view.getUint32(end + 16, true);
    const files: Record<string, string> = {};
    for (let i = 0; i < 2; i++) {
      expect(view.getUint32(cursor, true)).toBe(0x02014b50);
      const size = view.getUint32(cursor + 24, true);
      const nameLength = view.getUint16(cursor + 28, true);
      const localOffset = view.getUint32(cursor + 42, true);
      const name = new TextDecoder().decode(zip.subarray(cursor + 46, cursor + 46 + nameLength));
      const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true);
      files[name] = new TextDecoder().decode(zip.subarray(dataStart, dataStart + size));
      expect(view.getUint32(cursor + 16, true)).toBe(crc32(zip.subarray(dataStart, dataStart + size)));
      cursor += 46 + nameLength;
    }

    expect(files).toEqual({ "a.txt": "hello", "folder/ü.txt": "world!" });
  });

  it("produces a valid empty archive", () => {
    expect(createZip([])).toHaveLength(22);
  });
});
