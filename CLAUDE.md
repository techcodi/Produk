# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

ProDuk is a platform of free, private file tools that run entirely in the browser: no backend, no uploads, no login. All routes are statically rendered. Live tools include Images to PDF, Merge PDF, Split PDF, PDF to Images, Edit PDF, Word to PDF, Text to PDF, Compress Image, Resize Image, Remove Background, Passport Photo Maker, Invoice Generator, QR Code Generator and Text to Audio (`src/config/tools.ts` is the full list).

## Next.js version warning

This project uses **Next.js 16.4 / React 19.3**, which has breaking changes compared with older Next.js versions. Before writing Next-specific code, read the relevant guide in `node_modules/next/dist/docs/` and follow its deprecation notices (see `AGENTS.md`). `next.config.ts` enables `cacheComponents` and `partialPrefetching`. Tailwind v4 runs through the `@tailwindcss/turbopack` CSS loader, not PostCSS.

## Commands

```bash
npm run dev          # http://localhost:3000
npm run build        # production build (all routes static)
npm test             # vitest run (only src/**/*.test.ts)
npx vitest run src/features/images-to-pdf/core/layout.test.ts   # single test file
npx vitest run -t "name of test"                                 # single test by name
npm run typecheck    # tsc --noEmit
npm run lint         # eslint (next core-web-vitals + typescript configs)
```

Tests cover only pure logic (`features/*/core/`, `lib/`) and run in Node, with no DOM environment. The `@/*` alias maps to `src/*` in both tsconfig and vitest.

`predev` and `prebuild` run `scripts/copy-pdfjs-assets.mjs`. This copies the PDF.js worker, fonts, CMaps and WASM decoders into `public/pdfjs/<version>/`, which is gitignored and also excluded from ESLint. `lib/pdf/render.ts` loads them from there at runtime. If you run `next dev` directly, run that script first, or PDF previews will fail.

`predev`/`prebuild` also run `scripts/copy-ml-assets.mjs`. It copies the ONNX Runtime WebAssembly files into `public/ort/<version>/`: the plain WASM build and the asyncify build used for WebGPU. Remove Background and Text to Audio both load them from there, so don't drop either file. The script also downloads the small background-removal model (U²-Net-p) into `public/models/`, checking its SHA-256 against a pinned revision. That folder is gitignored, and the build needs network access to fill it.

**Background removal** lives in `lib/background-removal/`, shared by Remove Background and Passport Photo Maker. Inference runs in a Web Worker (`inference.worker.ts`), so a slow model never freezes the page. The large HD model (BiRefNet-lite-512, MIT) is not bundled. The browser fetches it from a pinned Hugging Face revision, verifies its SHA-256 and keeps it in Cache Storage (`model-store.ts`). Only images on the device are processed; the model is the only thing downloaded. HD is only offered when WebGPU supports `shader-f16`. On the CPU it takes many minutes, so it is never offered there. If WebGPU fails mid-run, it still falls back to WASM. `removeBackground` also returns the low-resolution mask; Passport Photo Maker uses it to locate the head (`features/passport-photo/core/framing.ts`). Only add models whose licence allows commercial use: RMBG, for example, does not.

`predev`/`prebuild` also run `scripts/copy-tts-assets.mjs`, which copies the Piper phonemizer (espeak-ng as WebAssembly, GPL-3.0, shipped unmodified) into `public/tts/` for Text to Audio. Its inference worker reuses ONNX Runtime from `public/ort/`. Voice models are not bundled: the browser downloads them from a pinned Hugging Face revision and keeps them in Cache Storage. Only add voices whose model card allows commercial use.

## Architecture

**Dependency rule:** `app → features → components / hooks / lib / config`. Features never import from other features, and `features/*/core/` and `lib/` never import React. When two tools need the same thing, move it to the shared layer instead of copying it:

- `lib/` holds the non-React building blocks:
  - `files.ts`: validation, `partitionFiles` and file names.
  - `images.ts`: decoding (EXIF-aware), canvas helpers, the canvas size limits and HEIC conversion.
  - `zip.ts`: a store-only ZIP writer with no dependencies.
  - `batch.ts`: per-item downloads plus a ZIP.
  - `pdf/documents.ts`: pdf-lib for writing PDFs. `readPdf` rejects password-protected files.
  - `pdf/render.ts`: PDF.js for rendering pages.
  - `pdf/page-ranges.ts`: parses ranges such as "1-3, 5, 8-".
  - `document/`: the rich-text document pipeline shared by Text to PDF and Word to PDF. Editor JSON goes to PDF through `to-pdfmake.ts` (a pure converter, then pdfmake). Editor HTML goes to .docx through `to-docx.ts` (`docx/html`'s `htmlToContent`). `import.ts` reads .docx with mammoth and plain text. `export.ts` re-encodes images to PNG/JPEG before either exporter runs.
- `hooks/` holds the shared hooks:
  - `useTask` runs any job that can be cancelled and reports progress, ignoring stale runs and freeing result URLs.
  - `useImageFiles` is a batch image list with preview URLs.
  - `useSinglePdf` and `usePdfDocument` manage one PDF opened with PDF.js.
  - `usePasteFiles` handles pasted files.
  - `useDocumentEditor` and `useDocumentExport` provide the TipTap editor and its PDF/Word export.
- `components/files/` holds the shared tool UI: `DropZone`, `TaskPanel` (start, progress, cancel, download, error), `ToolWorkspace` (two-column layout with the action pinned to the bottom on mobile), and `RejectedNotice`. `components/pdf/pdf-page-grid.tsx` renders page thumbnails lazily, only as they scroll into view.

`components/editor/` holds the editor UI: a toolbar, a page-like sheet that follows the export settings, the settings panel and the PDF/Word export panel.

PDFs are handled by three libraries:

- **pdf-lib** creates and edits PDFs (merge, split, images to PDF, Edit PDF's save step).
- **PDF.js** (`pdfjs-dist`, legacy build for older phones) renders pages for previews, PDF to Images and Edit PDF.
- **pdfmake** lays out flowing documents (Text and Word to PDF). Its bundled Roboto fonts are also Edit PDF's fallback for text the standard fonts can't encode, such as ₦.

**Cache Components gotcha:** Next prerenders client components too, and it rejects `Math.random()`, `Date.now()` and similar calls made during render. TipTap calls `Math.random()` while rendering, so the editor-based tools are loaded with `next/dynamic` and `{ ssr: false }` (see `features/text-to-pdf/components/text-to-pdf-tool.tsx`). Do the same for any other library that does this.

**Edit PDF** (`features/edit-pdf`) never rewrites existing content. Each object (edited text, new text, image or signature, whiteout) is stored in the page's *viewport* space: points, top-left origin, page rotation applied. `core/geometry.ts` maps objects to PDF user space only when saving. "Editing" existing text paints a cover in a background colour sampled from the page, then draws new text at the same baseline. The original glyphs stay in the file, and the UI says so. On-screen text and saved text line up because both use `LINE_HEIGHT` and `BASELINE_RATIO` in `constants.ts`. Change those numbers only together with the preview fonts.

- `src/config/tools.ts` is the **tool registry and single source of truth**. The home page, header nav, sitemap and per-tool metadata (`lib/metadata.ts` → `toolMetadata`) are all derived from it. `getTool(slug)` throws on an unknown slug.
- `src/app/(tools)/<slug>/page.tsx` contains thin server pages. Each one wraps the feature's container component in the shared `ToolPage` shell (`components/tools/tool-page.tsx`), which renders the heading, the privacy badge and the "How it works" steps from the registry entry.
- `src/features/<slug>/` is a self-contained tool module:
  - `index.ts` is the public API. Routes import only from here, never from internals.
  - `core/` holds the pure or browser-only logic with no React.
  - `hooks/` holds state and side effects specific to the tool.
  - `components/` holds the presentational pieces plus one `"use client"` container. Each container follows the same pattern: every edit calls the task's `reset()` so a result from old inputs is never shown, and `start()` resolves with the result, which the container then auto-downloads.
- `src/components/` contains platform-level, tool-agnostic UI: `ui/` primitives, `layout/`, `brand/` and `tools/`.
- Styling uses the semantic design tokens defined in `src/app/globals.css` (`bg-surface`, `text-muted`, `border-border`, `bg-brand`, and so on), with automatic dark mode through `prefers-color-scheme`. Use these tokens instead of raw colors. Merge classes with `cn()` from `lib/cn.ts`.
- Heavy libraries are lazy-loaded with dynamic `import()`: `pdf-lib` (`loadPdfLib`), `pdfjs-dist` (`loadPdfjs`) and `heic2any` (`convertHeicToJpeg`). Keep them out of the initial bundle.
- Every canvas allocation goes through `clampToCanvasLimits` (max 4000px per side and 16MP in total) so it stays under iOS Safari's canvas limit. `canvasToBlob` may return PNG when the browser can't encode WebP, so always derive the file extension from `blob.type`.

### Images to PDF pipeline

1. **Import:** files are validated by MIME type *or* by extension, because HEIC files often have no MIME type. File limits are enforced, and HEIC images are converted to JPEG.
2. **Edit:** the image list is managed by a reducer. Users can reorder with pointer, touch long-press or keyboard (dnd-kit), and can rotate, sort and reverse. Preview object URLs must be revoked when items are removed.
3. **Export:** each page goes through these steps:
   - Decode the image (EXIF-aware), then rotate it, flatten it onto white, downscale it to the quality preset and re-encode it as JPEG.
   - Compute the page layout with a pure function.
   - Embed the page with `pdf-lib`, then yield to the main thread.

   The export can be cancelled through an `AbortController`, and stale runs are ignored. The canvas is capped at 4000px to stay under iOS Safari's ~16.7MP canvas limit.

## Adding a new tool

1. Add or update the entry in `src/config/tools.ts` (`status: "live"` when ready). Give it a `seoTitle` that leads with the phrase people search for (e.g. "JPG to PDF Converter — …"); `lib/metadata.test.ts` checks it fits in a search result. Tool pages also get schema.org JSON-LD from `ToolPage`.
2. Create `src/features/<slug>/` following the structure above.
3. Add `src/app/(tools)/<slug>/page.tsx`:
   ```tsx
   const tool = getTool("<slug>");
   export const metadata = toolMetadata(tool);
   export default function Page() {
     return <ToolPage tool={tool}><YourTool /></ToolPage>;
   }
   ```

The home page, the footer tool directory (grouped by `categoryLabels`), the sitemap and the SEO metadata pick up the new tool automatically. The site URL comes from `NEXT_PUBLIC_SITE_URL` (`src/config/site.ts`).
