// Copies PDF.js runtime assets (worker, fonts, CMaps, WASM decoders) into
// public/pdfjs/<version>/ so they are served from our own origin. The version
// in the path lets them be cached forever. Runs before `dev` and `build`.
import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = dirname(require.resolve("pdfjs-dist/package.json"));
const { version } = JSON.parse(await readFile(join(root, "package.json"), "utf8"));

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "pdfjs");
const target = join(publicDir, version);

if (existsSync(join(target, "pdf.worker.min.mjs"))) process.exit(0);

await rm(publicDir, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(join(root, "legacy", "build", "pdf.worker.min.mjs"), join(target, "pdf.worker.min.mjs"));
for (const dir of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  await cp(join(root, dir), join(target, dir), { recursive: true });
}
console.log(`Copied PDF.js ${version} assets to public/pdfjs/${version}`);
