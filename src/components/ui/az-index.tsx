"use client";

import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import { toPinyin } from "@/lib/pinyin";

interface AzIndexProps {
  labels: string[];
  sectionIdPrefix: string;
}

function firstLetter(label: string): string {
  if (!label) return "#";
  try {
    const ch = label.charAt(0);
    if (/[a-zA-Z]/.test(ch)) return ch.toUpperCase();
    const py = toPinyin(label);
    const l = py.charAt(0).toUpperCase();
    return l || "#";
  } catch {
    const ch = label.charAt(0).toUpperCase();
    return /[A-Z]/.test(ch) ? ch : "#";
  }
}

/**
 * 可拖拽的 A-Z 索引滚动条。
 * 拖拽或点击字母时，滚动到对应分组；拖拽过程中显示放大的当前字母提示。
 * 字母数量 < 5 时不显示索引条。
 */
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

  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 清理 timeout
  useEffect(() => {
    return () => {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = undefined; }
    };
  }, []);

  // ⚠️ 所有 hooks 必须在 early return 之前调用，确保每次 render 的 hook 数量一致
  const handlePointer = useCallback(
    (clientY: number) => {
      const bar = barRef.current;
      if (!bar) return;
      const children = bar.querySelectorAll<HTMLElement>("[data-letter]");
      if (children.length === 0) return;

      let closest: HTMLElement = children[0];
      let minDist = Infinity;
      for (const child of children) {
        const rect = child.getBoundingClientRect();
        const dist = Math.abs(clientY - (rect.top + rect.height / 2));
        if (dist < minDist) {
          minDist = dist;
          closest = child;
        }
      }

      const letter = closest.dataset.letter!;
      setActiveLetter(letter);
      const el = document.getElementById(`${sectionIdPrefix}-${letter}`);
      if (el) el.scrollIntoView({ block: "start" });
    },
    [sectionIdPrefix],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      e.preventDefault();
      dragging.current = true;
      target.setPointerCapture(e.pointerId);
      handlePointer(e.clientY);
    },
    [handlePointer],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      handlePointer(e.clientY);
    },
    [handlePointer],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setActiveLetter(null), 400);
  }, []);

  if (letters.length < 5) return null;

  return (
    <>
      {activeLetter && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-(--fg) text-[28px] font-[620] text-(--bg) shadow-lg">
            {activeLetter}
          </span>
        </div>
      )}

      <nav
        ref={barRef}
        className="fixed right-0.5 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-[1px] rounded-full bg-(--surface)/95 px-[3px] py-2 shadow-sm backdrop-blur-sm select-none touch-none"
        style={{ boxShadow: "var(--shadow-md)" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {letters.map((l) => (
          <span
            key={l}
            data-letter={l}
            className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-[600] text-(--muted)"
          >
            {l}
          </span>
        ))}
      </nav>
    </>
  );
}

/**
 * 按拼音首字母分组，每组渲染一个带 id 的区块。
 */
export function groupByFirstLetter<T>(
  items: T[],
  getName: (item: T) => string,
): { letter: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const name = getName(item);
    const l = firstLetter(name).toUpperCase();
    if (!groups.has(l)) groups.set(l, []);
    groups.get(l)!.push(item);
  }
  const entries = [...groups.entries()];
  const alpha = entries
    .filter(([l]) => /[A-Z]/.test(l))
    .sort((a, b) => a[0].localeCompare(b[0]));
  const other = entries.filter(([l]) => !/[A-Z]/.test(l));
  return [...alpha, ...other].map(([letter, items]) => ({ letter, items }));
}
