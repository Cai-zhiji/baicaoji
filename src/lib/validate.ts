/**
 * 共享 API 参数验证工具
 */

/** 安全地将 string 解析为正整数，失败返回 NaN */
export function parseId(raw: string | undefined): number {
  if (raw == null) return NaN;
  const n = parseInt(raw, 10);
  return isNaN(n) || n <= 0 ? NaN : n;
}

/** 安全地将 string 解析为数字，失败返回 NaN */
export function parseNumber(raw: unknown): number {
  if (raw == null || raw === "") return NaN;
  const n = parseFloat(String(raw));
  return isNaN(n) ? NaN : n;
}
