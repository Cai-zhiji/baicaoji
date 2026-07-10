import { pinyin } from "pinyin-pro";

/**
 * Generate pinyin from Chinese herb name.
 * e.g. "当归" → "danggui"
 */
export function toPinyin(text: string): string {
  return pinyin(text, { toneType: "none", type: "array" }).join("");
}

/**
 * Get pinyin initials for search.
 * e.g. "当归" → "dg"
 */
export function toPinyinInitials(text: string): string {
  return pinyin(text, {
    toneType: "none",
    type: "array",
  })
    .map((s: string) => s.charAt(0))
    .join("");
}
