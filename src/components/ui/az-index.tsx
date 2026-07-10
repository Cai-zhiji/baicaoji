"use client";

import { useMemo } from "react";
import { toPinyin } from "@/lib/pinyin";

interface AzIndexProps {
  /** 所有项的标签列表 */
  labels: string[];
  /** 点击字母时滚动到的元素 ID 前缀 */
  sectionIdPrefix: string;
}

/** 提取中文拼音首字母，英文字母直接返回大写 */
function firstLetter(label: string): string {
  if (!label) return "#";
  const ch = label.charAt(0);
  if (/[a-zA-Z]/.test(ch)) return ch.toUpperCase();
  // 中文：取拼音首字母
  const py = toPinyin(label);
  return py.charAt(0).toUpperCase() || "#";
}

/** 侧边 A-Z 快速索引条 */
export function AzIndex({ labels, sectionIdPrefix }: AzIndexProps) {
  const letters = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const label of labels) {
      const l = firstLetter(label).toUpperCase();
      if (l && !seen.has(l)) {
        seen.add(l);
        result.push(l);
      }
    }
    const alpha = result.filter((l) => /[A-Z]/.test(l)).sort();
    const other = result.filter((l) => !/[A-Z]/.test(l));
    return [...alpha, ...other];
  }, [labels]);

  if (letters.length < 5) return null;

  function scrollTo(letter: string) {
    const el = document.getElementById(`${sectionIdPrefix}-${letter}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <nav
      className="fixed right-1 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-0.5 rounded-full bg-(--surface)/90 px-1 py-2 shadow-sm backdrop-blur-sm"
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      {letters.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => scrollTo(l)}
          className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-[550] text-(--muted) transition-colors hover:bg-(--accent-soft) hover:text-(--accent)"
        >
          {l}
        </button>
      ))}
    </nav>
  );
}

/**
 * 按拼音首字母分组，每组渲染一个带 id 的区块。
 */
export function groupByFirstLetter<T>(
  items: T[],
  getName: (item: T) => string
): { letter: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const name = getName(item);
    const l = firstLetter(name).toUpperCase();
    if (!groups.has(l)) groups.set(l, []);
    groups.get(l)!.push(item);
  }
  const entries = [...groups.entries()];
  const alpha = entries.filter(([l]) => /[A-Z]/.test(l)).sort((a, b) => a[0].localeCompare(b[0]));
  const other = entries.filter(([l]) => !/[A-Z]/.test(l));
  return [...alpha, ...other].map(([letter, items]) => ({ letter, items }));
}
