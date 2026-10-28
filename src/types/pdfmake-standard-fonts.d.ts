// pdfmake ships its standard-font containers without type declarations.
declare module "pdfmake/build/standard-fonts/*" {
  import type { TFontContainer } from "pdfmake/interfaces";

  const fontContainer: TFontContainer;
  export default fontContainer;
}
