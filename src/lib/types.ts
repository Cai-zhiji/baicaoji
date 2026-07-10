/** 共享领域类型 — 所有页面和路由的单一来源 */

/* ── 药材 Herb ── */

export interface Herb {
  id: number;
  name: string;
  pinyin: string;
  sellPrice: number;
  costPrice: number;
  stock: number;
  unit: string | null;
  unitGrams: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/** 药材搜索选项（combobox 用） */
export interface HerbOption {
  key: string;
  label: string;
  searchTokens: string[];
  meta: React.ReactNode;
  data: Herb;
}

/* ── 病人 Patient ── */

export interface Patient {
  id: number;
  name: string;
  gender: string;
  age: number | null;
  phone: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PatientOption {
  key: string;
  label: string;
  searchTokens: string[];
  meta: React.ReactNode;
  data: Patient;
}

/* ── 药方 Prescription ── */

export interface PrescriptionItem {
  id?: number;
  herbId: number | null;
  herbName: string;
  herb?: { id: number; name: string } | null;
  grams: number;
  unitPrice: number;
  unitCost: number;
}

export interface Prescription {
  id: number;
  patientId: number | null;
  patient?: { id: number; name: string } | null;
  totalPrice: number;
  totalCost: number;
  createdAt: Date | string;
  items: PrescriptionItem[];
  followUps?: FollowUp[];
}

/* ── 药方模版 Template ── */

export interface TemplateItem {
  herbId: number | null;
  herbName: string;
  grams: number;
  /** 是否在药材系统中存在（false 表示仅保留名称，方剂完整性用） */
  herbExists: boolean;
}

export interface Template {
  id: number;
  name: string;
  lastUsedAt: string | null;
  items: TemplateItem[];
}

/** 模版输入项（创建/更新用） */
export interface TemplateItemInput {
  herbId?: number | null;
  herbName: string;
  grams?: number;
}

/* ── 库存记录 StockRecord ── */

export interface StockRecord {
  id: number;
  herbId: number;
  herb?: { name: string };
  type: "in" | "out";
  grams: number;
  unitPrice: number | null;
  createdAt: Date | string;
}

/* ── 随访 FollowUp ── */

export interface FollowUp {
  id: number;
  prescriptionId: number;
  evaluation: string;
  note: string | null;
  createdAt: Date | string;
}

/* ── 统计 Stats ── */

export interface HerbBreakdownItem {
  name: string;
  revenue: number;
  cost: number;
  profit: number;
  prescriptionCount: number;
}

export interface StatsData {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  prescriptionCount: number;
  herbBreakdown: HerbBreakdownItem[];
}

/* ── API 响应 ── */

export interface ApiError {
  error: string;
}

export interface ApiSuccess {
  success: true;
}
