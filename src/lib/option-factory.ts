/**
 * 共享领域实体 → ComboboxOption 转换器。
 *
 * 所有页面的 ComboboxOption 工厂统一入口，集中了拼音搜索令牌生成逻辑。
 * meta（右侧副文本）由调用方提供，因为不同页面的显示需求不同：
 * - 首页：售价 + 库存 badge（带颜色）
 * - 库存页：库存克数
 * - 模版页：售价 + 替代单位
 */
import { toPinyinInitials } from "@/lib/pinyin";
import type { Herb, Patient, Template, HerbOption, PatientOption } from "@/lib/types";
import type { ComboboxOption } from "@/components/ui/inline-combobox";

/** Safely get pinyin initials, returning empty string on failure */
function safePinyinInitials(name: string): string {
  try {
    return toPinyinInitials(name);
  } catch {
    return "";
  }
}

/** 标准药材搜索选项 */
export function herbToOption(h: Herb, meta?: React.ReactNode): ComboboxOption<Herb> {
  return {
    key: h.id,
    label: h.name,
    searchTokens: [h.pinyin, safePinyinInitials(h.name)],
    meta,
    data: h,
  };
}

/** 病人搜索选项 */
export function patientToOption(p: Patient, meta?: React.ReactNode): ComboboxOption<Patient> {
  return {
    key: p.id,
    label: p.name,
    searchTokens: [
      safePinyinInitials(p.name),
      p.phone ?? "",
      p.gender,
    ].filter(Boolean),
    meta,
    data: p,
  };
}

/** 模版搜索选项 */
export function templateToOption(t: Template, meta?: React.ReactNode): ComboboxOption<Template> {
  return {
    key: t.id,
    label: t.name,
    searchTokens: [
      safePinyinInitials(t.name),
      `${t.items.length}味药`,
    ],
    meta,
    data: t,
  };
}

// 同时导出为 herbBuilder / patientBuilder 等语义化别名，保持类型友好
export { herbToOption as toHerbOption };
export { patientToOption as toPatientOption };
export { templateToOption as toTemplateOption };
