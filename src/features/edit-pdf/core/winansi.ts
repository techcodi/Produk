/**
 * Characters the PDF standard fonts (Helvetica, Times, Courier) can show:
 * WinAnsi encoding, i.e. Latin-1 plus a handful of typographic extras.
 * Anything else is drawn with an embedded Unicode font instead.
 */
const WINANSI_EXTRAS = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

export function isWinAnsiChar(char: string): boolean {
  const code = char.codePointAt(0)!;
  return (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WINANSI_EXTRAS.has(char);
}

/** True when every character (ignoring line breaks and tabs) works with the standard fonts. */
export function fitsStandardFonts(text: string): boolean {
  for (const char of text) {
    if (char === "\n" || char === "\t" || char === "\r") continue;
    if (!isWinAnsiChar(char)) return false;
  }
  return true;
}
