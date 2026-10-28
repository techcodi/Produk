# ProDuk

A growing platform of free, private file tools. Everything runs in the browser, with no backend, no uploads and no login.

**Live tools:** Images to PDF, Merge PDF, Split PDF, PDF to Images, Compress Image, Resize Image

## Stack

Next.js 16 (App Router, static output) · React 19 · TypeScript · Tailwind CSS v4 · pdf-lib · PDF.js · dnd-kit · heic2any · Vitest

## Scripts

```bash
npm run dev        # http://localhost:3000 (first copies PDF.js assets to public/pdfjs/)
npm run build      # production build (all routes are static)
npm test           # unit tests for pure core logic
npm run typecheck
npm run lint
```

## Architecture

```
src/
  app/                     Routes only: thin pages, metadata, sitemap/robots
    (tools)/<slug>/page.tsx  One folder per tool → per-tool code splitting + SEO
  config/
    site.ts                Brand + site URL (NEXT_PUBLIC_SITE_URL)
    tools.ts               Tool registry: single source of truth for home, nav, sitemap, metadata
  components/              Platform-level, tool-agnostic UI
    ui/                    Primitives (Button, SegmentedControl, ProgressBar, TextField)
    files/                 Shared tool UI (DropZone, TaskPanel, ToolWorkspace, ...)
    pdf/                   Lazy PDF page thumbnails
    layout/  brand/  tools/  Header/footer, logo, ToolCard + ToolPage shell
  hooks/                   Shared hooks (useTask, useImageFiles, useSinglePdf, ...)
  lib/                     Generic helpers: files, images/canvas, zip, batch output,
    pdf/                   pdf-lib documents, PDF.js rendering, page-range parsing
  features/<tool>/         Self-contained tool module
    index.ts               Public API: routes import only from here
    types.ts constants.ts
    core/                  Pure/browser logic, no React (layout math, validation, image + PDF pipeline)
    hooks/                 State + side effects (collection reducer, export state machine)
    components/            Presentational pieces + one container component
```

**Dependency rule:** `app → features → components/hooks/lib/config`. Features never import from other features (shared code moves to `lib/`, `hooks/` or `components/`), and `core/` and `lib/` never import React. That keeps the logic unit-testable and lets it move into a Web Worker later.

### Images to PDF pipeline

1. **Import:** validate by MIME type *or* extension (HEIC often has no MIME type), enforce limits, and convert HEIC to JPEG with a lazily loaded `heic2any`.
2. **Edit:** reducer-managed list. Reorder by pointer, touch long-press or keyboard. Rotate. Sort A–Z. Reverse. Preview object URLs are revoked when items are removed.
3. **Export:** for each page, decode (EXIF-aware), then rotate, flatten onto white, downscale to the quality preset, and re-encode as JPEG. Then compute the page layout (pure function), embed the page with `pdf-lib` (lazily loaded), and yield to the main thread. The export can be cancelled with an `AbortController`, and stale runs are ignored.

The canvas size is capped at 4000px so it stays under iOS Safari's ~16.7MP canvas limit.

## Adding a new tool

1. Add an entry to `src/config/tools.ts` (set `status: "live"` when ready).
2. Create `src/features/<slug>/` following the structure above.
3. Add `src/app/(tools)/<slug>/page.tsx`:
   ```tsx
   const tool = getTool("<slug>");
   export const metadata = toolMetadata(tool);
   export default () => <ToolPage tool={tool}><YourTool /></ToolPage>;
   ```

The home page, header, sitemap and SEO metadata pick it up automatically.
