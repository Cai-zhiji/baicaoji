"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

/**
 * InlineCombobox — 输入框直接展开候选列表的组合框。
 * 与 Popover+Command 不同：外观就是一个 Input，获焦时下方原位展开结果。
 */

export interface ComboboxOption<T = unknown> {
  key: string | number;
  label: string;
  /** 搜索用附加字段（例如拼音、拼音首字母） */
  searchTokens?: string[];
  /** 右侧副文本 */
  meta?: React.ReactNode;
  /** 原始数据 */
  data?: T;
  disabled?: boolean;
}

export interface InlineComboboxProps<T = unknown> {
  options: ComboboxOption<T>[];
  onSelect: (option: ComboboxOption<T>) => void;
  placeholder?: string;
  /** 最多展示条数，默认 5 */
  maxResults?: number;
  /** 无匹配时的自定义节点（例如"新建 xxx"选项） */
  renderEmpty?: (query: string) => React.ReactNode;
  /** 空 query 时是否展示全量（默认 false，空 query 收起） */
  showAllOnEmpty?: boolean;
  /** 每次选中后是否清空输入框（默认 true） */
  clearOnSelect?: boolean;
  className?: string;
  inputClassName?: string;
  /** 左侧图标，默认 Search */
  leadingIcon?: React.ReactNode;
  /** 外部可控 query（可选） */
  value?: string;
  onChange?: (value: string) => void;
  autoFocus?: boolean;
}

export function InlineCombobox<T = unknown>({
  options,
  onSelect,
  placeholder = "输入以搜索…",
  maxResults = 5,
  renderEmpty,
  showAllOnEmpty = false,
  clearOnSelect = true,
  className,
  inputClassName,
  leadingIcon,
  value: controlledValue,
  onChange,
  autoFocus,
}: InlineComboboxProps<T>) {
  const [internalValue, setInternalValue] = React.useState("");
  const value = controlledValue ?? internalValue;
  const setValue = (v: string) => {
    if (onChange) onChange(v);
    else setInternalValue(v);
  };

  const [open, setOpen] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const query = value.trim().toLowerCase();

  const results = React.useMemo(() => {
    if (!query) {
      return showAllOnEmpty ? options.slice(0, maxResults) : [];
    }
    const scored: Array<{ opt: ComboboxOption<T>; score: number }> = [];
    for (const opt of options) {
      const label = opt.label.toLowerCase();
      const tokens = (opt.searchTokens ?? []).map((t) => t.toLowerCase());
      let score = 0;
      if (label.startsWith(query)) score = 100;
      else if (label.includes(query)) score = 80;
      else if (tokens.some((t) => t.startsWith(query))) score = 60;
      else if (tokens.some((t) => t.includes(query))) score = 40;
      if (score > 0) scored.push({ opt, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxResults).map((s) => s.opt);
  }, [query, options, maxResults, showAllOnEmpty]);

  // Reset active index when results change
  React.useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // Close when clicking outside
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function handleSelect(opt: ComboboxOption<T>) {
    if (opt.disabled) return;
    onSelect(opt);
    if (clearOnSelect) setValue("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIdx]) {
        handleSelect(results[activeIdx]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const showResults = open && (results.length > 0 || (query && renderEmpty));

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative flex items-center">
        <span className="pointer-events-none absolute left-3 flex h-full items-center text-(--muted)">
          {leadingIcon ?? <Search className="h-4 w-4" />}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            "flex h-[var(--input-h)] w-full rounded-[var(--radius-val)] border border-(--border) bg-(--surface)",
            "pl-10 pr-3 text-[15px] text-(--fg) placeholder:text-(--muted)",
            "transition-colors focus:border-(--accent) focus:outline-none",
            "focus:shadow-[var(--shadow-glow)]",
            inputClassName
          )}
        />
      </div>

      {showResults && (
        <div
          className="absolute left-0 right-0 top-[calc(var(--input-h)+6px)] z-20 overflow-hidden rounded-[var(--radius-val)] border border-(--border) bg-(--surface)"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          {results.length > 0 ? (
            <ul className="max-h-[320px] overflow-y-auto">
              {results.map((opt, i) => (
                <li key={opt.key}>
                  <button
                    type="button"
                    disabled={opt.disabled}
                    onMouseDown={(e) => {
                      e.preventDefault(); // 避免抢走 input focus 导致 blur 先触发
                      handleSelect(opt);
                    }}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left",
                      "border-b border-(--border) last:border-b-0",
                      "text-[14px] text-(--fg) transition-colors",
                      i === activeIdx && "bg-(--accent-soft)",
                      opt.disabled && "opacity-40"
                    )}
                  >
                    <span className="truncate font-medium">{opt.label}</span>
                    {opt.meta && (
                      <span className="shrink-0 text-[12px] text-(--muted)">
                        {opt.meta}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3">{renderEmpty?.(query)}</div>
          )}
        </div>
      )}
    </div>
  );
}
