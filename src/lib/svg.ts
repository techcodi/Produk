/** Escapes text for use inside SVG/XML content or attribute values. */
export const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Width of `text` in the units the caller lays out in (e.g. mm at a given font size). */
export type MeasureText = (text: string) => number;

/**
 * Greedy word wrap: splits `text` into lines no wider than `maxWidth`, keeping
 * existing line breaks. A single word too long for a line is broken by character.
 * Stops at `maxLines`, ending the last line with an ellipsis if text was cut.
 */
export function wrapLines(text: string, maxWidth: number, measure: MeasureText, maxLines = Infinity): string[] {
  const lines: string[] = [];
  const push = (line: string) => lines.push(line);

  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) push(line);
      // Break words that can't fit on a line of their own.
      let rest = word;
      while (measure(rest) > maxWidth && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && measure(rest.slice(0, cut)) > maxWidth) cut--;
        push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    push(line);
  }

  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && measure(`${last}…`) > maxWidth) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last.trimEnd()}…`;
  return kept;
}

let measureCanvas: CanvasRenderingContext2D | null = null;

/**
 * A browser `MeasureText` for `fontSize` user units in `fontFamily`. Text in an
 * SVG drawn as an image can only use system fonts, so measure with the same stack.
 */
export function canvasMeasure(fontFamily: string, fontSize: number, fontWeight: number | string = 400): MeasureText {
  measureCanvas ??= document.createElement("canvas").getContext("2d");
  const ctx = measureCanvas!;
  // Measure at 100px for precision, then scale to the requested size.
  const font = `${fontWeight} 100px ${fontFamily}`;
  return (text) => {
    ctx.font = font;
    return (ctx.measureText(text).width / 100) * fontSize;
  };
}
