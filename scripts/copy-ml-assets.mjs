// Prepares on-device AI assets for the background remover, served from our own
// origin: the ONNX Runtime WebAssembly binaries (public/ort/<version>/) and the
// small background-removal model (public/models/), downloaded once from a
// pinned Hugging Face revision and checked against its SHA-256. Runs before
// `dev` and `build`. The large "HD" model is not bundled; the browser fetches
// it on demand (see src/lib/background-removal/models.ts).
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(projectDir, "public");

// --- ONNX Runtime Web: only the plain WASM build and the WebGPU (asyncify) build are used.
// The package's "exports" hides package.json, so locate it directly.
const ortRoot = join(projectDir, "node_modules", "onnxruntime-web");
const { version: ortVersion } = JSON.parse(await readFile(join(ortRoot, "package.json"), "utf8"));
const ortTarget = join(publicDir, "ort", ortVersion);
const ORT_FILES = [
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.asyncify.wasm",
  "ort-wasm-simd-threaded.asyncify.mjs",
];

if (!ORT_FILES.every((file) => existsSync(join(ortTarget, file)))) {
  await rm(join(publicDir, "ort"), { recursive: true, force: true });
  await mkdir(ortTarget, { recursive: true });
  for (const file of ORT_FILES) await cp(join(ortRoot, "dist", file), join(ortTarget, file));
  console.log(`Copied ONNX Runtime ${ortVersion} to public/ort/${ortVersion}`);
}

// --- Small background-removal model (U²-Net-p, Apache-2.0).
const MODEL = {
  file: "u2netp-7112208.onnx",
  url: "https://huggingface.co/BritishWerewolf/U-2-Netp/resolve/7112208dbac3a3642496c8d54e2f0f9bb3dc1dc8/onnx/model.onnx",
  sha256: "309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8",
};
const modelsDir = join(publicDir, "models");
const modelPath = join(modelsDir, MODEL.file);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

if (!existsSync(modelPath) || sha256(await readFile(modelPath)) !== MODEL.sha256) {
  const response = await fetch(MODEL.url);
  if (!response.ok) throw new Error(`Could not download ${MODEL.url}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (sha256(bytes) !== MODEL.sha256) throw new Error(`Checksum mismatch for ${MODEL.file}; refusing to use it`);
  await mkdir(modelsDir, { recursive: true });
  // Drop older revisions so stale models aren't deployed.
  for (const old of existsSync(modelsDir) ? await readdir(modelsDir) : []) {
    if (old.startsWith("u2netp-") && old !== MODEL.file) await rm(join(modelsDir, old));
  }
  await writeFile(modelPath, bytes);
  console.log(`Downloaded ${MODEL.file} (${(bytes.length / 1e6).toFixed(1)} MB)`);
}
