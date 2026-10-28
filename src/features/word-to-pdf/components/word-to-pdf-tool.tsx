"use client";

import dynamic from "next/dynamic";
import { EditorSkeleton } from "@/components/editor/editor-skeleton";

/**
 * Browser-only: the editor generates ids with Math.random() while rendering,
 * which Cache Components rejects during prerender. Loading it this way also
 * keeps TipTap out of the page's initial JavaScript.
 */
export const WordToPdfTool = dynamic(() => import("./word-to-pdf-workspace").then((m) => m.WordToPdfWorkspace), {
  ssr: false,
  loading: () => <EditorSkeleton label="Loading…" />,
});
