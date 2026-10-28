/**
 * Re-positions a standalone `<svg>` string so it can be nested inside another
 * SVG: drops its own size/position and places it at `x,y` with `width×height`
 * (in the parent's units). Its viewBox scales the content to fit.
 */
export function nestSvg(svg: string, x: number, y: number, width: number, height: number): string {
  return svg.replace(/^<svg\b([^>]*)>/, (_, attributes: string) => {
    const kept = attributes.replace(/\s(?:width|height|x|y)="[^"]*"/g, "");
    return `<svg${kept} x="${x}" y="${y}" width="${width}" height="${height}">`;
  });
}
