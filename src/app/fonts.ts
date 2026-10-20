import { Onest } from "next/font/google";

// Onest covers every Azerbaijani letter (including Ə/ə, U+018F/U+0259), Turkish
// and Cyrillic in one family, so no glyph falls back to a different typeface.
// (Manrope, used before, has no capital Ə and mixed two fonts in one word.)
export const onest = Onest({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-onest",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});
