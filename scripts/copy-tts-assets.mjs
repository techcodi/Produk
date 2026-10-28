// Copies Text to Audio's runtime files into public/tts/ so they are served from
// our own origin, with versions in the paths so they can be cached forever:
//
// - piper-phonemize-<version>/: the Piper phonemizer (espeak-ng compiled to
//   WebAssembly, plus its language data). Piper itself uses ONNX Runtime from
//   public/ort (scripts/copy-ml-assets.mjs).
// - ort-<version>/: the ONNX Runtime build bundled with @huggingface/transformers,
//   used by voice cloning. It is a different version from public/ort, so it gets its own copy.
//
// Voice models are fetched from Hugging Face on demand. Runs before `dev` and `build`.
//
// espeak-ng is GPL-3.0: the files are shipped unmodified, and the tool page
// links to their source (see features/text-to-audio/constants.ts).
import { cp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(projectDir, "public", "tts");
const readVersion = async (dir) => JSON.parse(await readFile(join(dir, "package.json"), "utf8")).version;

/** Copies `files` from `sourceDir` into public/tts/<name>, replacing older versions of the same `prefix`. */
async function publish(prefix, version, sourceDir, files) {
  const name = `${prefix}${version}`;
  const target = join(publicDir, name);
  if (files.every((file) => existsSync(join(target, file)))) return;

  for (const old of existsSync(publicDir) ? await readdir(publicDir) : []) {
    if (old.startsWith(prefix) && old !== name) await rm(join(publicDir, old), { recursive: true, force: true });
  }
  await mkdir(target, { recursive: true });
  for (const file of files) await cp(join(sourceDir, file), join(target, file));
  console.log(`Copied ${files.length} files to public/tts/${name}`);
}

// --- Piper phonemizer. The package's "main" points at a missing file, so locate it directly.
const piperRoot = join(projectDir, "node_modules", "@diffusionstudio", "piper-wasm");
await publish("piper-phonemize-", await readVersion(piperRoot), join(piperRoot, "build"), [
  "piper_phonemize.js",
  "piper_phonemize.wasm",
  "piper_phonemize.data",
]);

// --- transformers.js's own ONNX Runtime (nested when it differs from the top-level one).
const transformersRoot = join(projectDir, "node_modules", "@huggingface", "transformers");
const wanted = JSON.parse(await readFile(join(transformersRoot, "package.json"), "utf8")).dependencies["onnxruntime-web"];
const ortRoot = [join(transformersRoot, "node_modules", "onnxruntime-web"), join(projectDir, "node_modules", "onnxruntime-web")].find(
  (dir) => existsSync(join(dir, "package.json")),
);
const ortVersion = await readVersion(ortRoot);
if (ortVersion !== wanted) throw new Error(`transformers.js wants onnxruntime-web ${wanted}, found ${ortVersion}`);
// The "asyncify" build handles both WebGPU and plain WebAssembly.
await publish("ort-", ortVersion, join(ortRoot, "dist"), [
  "ort-wasm-simd-threaded.asyncify.mjs",
  "ort-wasm-simd-threaded.asyncify.wasm",
]);
