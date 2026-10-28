import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // PDF.js runtime assets copied by scripts/copy-pdfjs-assets.mjs
    "public/pdfjs/**",
    // Piper phonemizer copied by scripts/copy-tts-assets.mjs
    "public/tts/**",
    // ONNX Runtime files copied by scripts/copy-ml-assets.mjs
    "public/ort/**",
  ]),
]);

export default eslintConfig;
