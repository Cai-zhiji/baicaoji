# 百草计 · Architecture Review

> 日期：2026-07-10 · 范围：13 API routes · 8 pages · SQLite + Prisma

---

## 发现总览

| # | 问题 | 类别 | 强度 |
|---|------|------|------|
| 1 | 13 个 API route handler 全是浅层透传模块 | API / 领域逻辑 | Strong |
| 2 | CSV 解析器 copy-paste 到两个 import route | 代码重复 | Worth exploring |
| 3 | 统计页用比例估算代替精确成本 | 数据模型缺陷 | Worth exploring |
| 4 | 8 个页面各自实现相同的 fetch + toast 模式 | 前端重复 | Worth exploring |
| 5 | 模版数据 reshape 在 GET 和 POST 中各写一遍 | 代码重复 | Speculative |

---

## 1. 13 个 API Route 全是浅层透传模块 ⚡ Strong

**涉及文件：** `src/app/api/{herbs,patients,prescriptions,inventory,templates,follow-ups,stats,export}/**`（全部 13 个 route 文件，约 806 行）

### 问题

每个 route handler 都是同一模式的变体：

```
parse JSON body → 手动 validate → call Prisma → catch → return NextResponse.json({ error: "..." }, { status: 500 })
```

**三种典型重复：**

1. **GET 透传**（patients、herbs、inventory、templates）：handler 只做 `prisma.model.findMany()` + `NextResponse.json()`，零业务逻辑，零分页，零服务端过滤。Route handler 是一个无价值的包装器。

2. **CRUD [id] copy-paste**（patients/[id]、herbs/[id]、templates/[id]）：三个 DELETE handler 几乎完全一致，仅错误信息和模型名不同。PUT handler 共享相同的 `parseInt(id)` + 条件 spread 模式。

3. **业务逻辑困在 HTTP 层**（prescriptions POST）：成本计算、库存扣减、StockRecord 创建全部写在 handler 里，没有 `$transaction` 包裹。如果想从定时任务、CLI、或测试中创建药方——无法复用。

4. **16 个 try/catch 块无错误区分**：所有 catch 都返回通用 500。Prisma `RecordNotFound`、外键冲突、TypeError 全部静默吞掉，开发时看不到堆栈。

5. **无输入校验**（除 follow-ups 外）：age 可以是负数，phone 可以是任意字符串——没有 Zod schema，没有共享校验模块。

### 解决方案

提取领域函数到 `src/services/`：

- `createHerb(name, sellPrice, costPrice)` → 含校验 + pinyin 生成 + Prisma 调用
- `createPrescription(patientId, items)` → 含成本计算 + 库存扣减 + StockRecord + `$transaction`
- `listPatients()`、`getPatientById(id)`、`deletePatient(id)` → 共享 CRUD

Route handler 退化为薄适配器：

```ts
export async function POST(request: NextRequest) {
  try {
    const result = await herbService.create(await request.json());
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err, "创建药材失败");
  }
}
```

### 收益

- **leverage**：一个领域接口，N 个调用方（route + 测试 + 脚本）
- **locality**：库存扣减逻辑集中在一个函数，不再散落各处
- **interface 收缩**：route handler 从 30-60 行变为 5 行
- **可测试**：测试和 HTTP 跨越同一 seam——无需启动服务器
- 16 个 try/catch 整合为一个共享的 `handleApiError`

---

## 2. CSV 解析器 Copy-Paste 到两个 Import Route 🔶 Worth exploring

**涉及文件：**
- `src/app/api/herbs/import/route.ts:26-41`（`parseLine` 函数）
- `src/app/api/templates/import/route.ts:24-39`（完全相同的 `parseLine` 函数）

### 问题

两个 import route 各自内联了一个 16 行的 CSV 解析器（支持引号内逗号转义）。代码完全相同、逐字复制。改动 CSV 解析逻辑需要改两个地方，测试需要写两遍。

### 解决方案

提取到 `src/lib/csv.ts`：

```ts
export function parseCsv(text: string): string[][]
```

两个 import route 都成为同一个模块的调用方。

### 收益

- **locality**：一个 CSV 解析器，2 个调用方，1 个测试文件
- 每个 import route 减少 16 行
- 未来新的 CSV import（如病人批量导入）直接复用

---

## 3. 统计页用比例估算代替精确成本 🔶 Worth exploring

**涉及文件：** `src/app/api/stats/route.ts:46-59`

### 问题

`prescription_item` 表保存了 `unitPrice`（开方时的售价快照），但**没有**保存 `unitCost`（开方时的成本价快照）。统计 route 被迫用比例分摊估算每种药材的成本：

```ts
const proportion = totalRevenue > 0 ? revenue / totalRevenue : 0;
const estimatedCost = totalCost * proportion;
```

这意味着：如果当归售价占药方总价 30%，就假设当归成本也占 30%。当药材利润率不同时（如当归毛利 20%、黄芪毛利 80%），比例分摊会**系统性地算错每种药材的利润**。

### 解决方案

1. **数据模型**：`PrescriptionItem` 新增 `unitCost Float` 字段（与 `unitPrice` 对称）
2. **保存时快照**：在 prescriptions POST handler 中，创建 item 时同时记录 `herb.costPrice`
3. **统计简化**：stats route 改为 `item.grams * item.unitCost`——精确算术，不需要估算

### 收益

- **locality**：成本准确性在保存时一次性保证——统计只负责读取
- **interface 简化**：stats route 删除 40 行估算逻辑
- **数据完整性**：药材成本变动不会追溯扭曲历史利润

---

## 4. 8 个页面各自实现相同的 fetch + toast 模式 🔶 Worth exploring

**涉及文件：** `src/app/(main)/` 下全部 8 个 page 文件

### 问题

每个页面都独立实现了相同的数据获取：

```ts
const [data, setData] = useState<T[]>([]);
useEffect(() => {
  fetch("/api/xxx")
    .then((r) => r.json())
    .then(setData)
    .catch(() => toast.error("加载失败"));
}, []);
```

以及相同的保存/删除模式：

```ts
async function save() {
  if (!name.trim()) { toast.error("请输入..."); return; }
  try {
    const res = await fetch(url, { method, body: JSON.stringify(...) });
    if (res.ok) { toast.success("已保存"); /* refetch all */ }
    else { const err = await res.json(); toast.error(err.error); }
  } catch { toast.error("保存失败"); }
}
```

8 个页面、相同的模式、零共享抽象。没有 `useSWR`、没有 `@tanstack/react-query`、没有自定义 `useApi` hook。

### 解决方案

一个轻量 `useApi<T>(url)` hook：

```ts
const { data: herbs, loading, error, refetch } = useApi<Herb[]>('/api/herbs')
```

或引入 `swr`（2KB）获得缓存、去重、重试。页面从 6-10 行 boilerplate 缩减为一行调用。

### 收益

- **leverage**：一个 fetch 模块，8+ 个调用方
- **interface 收缩**：每个页面减少 6-10 行 boilerplate
- **locality**：loading/error/toast 语义在一个地方修改
- **未来扩展**：retry、缓存、乐观更新——加一次，所有页面受益

---

## 5. 模版数据 Reshape 在 GET 和 POST 中各写一遍 ⬜ Speculative

**涉及文件：** `src/app/api/templates/route.ts:14-23` 和 `:49-56`

### 问题

Prisma 嵌套结构 `{ items: [{ herb: { name } }] }` 扁平化为 `{ items: [{ herbId, herbName }] }` 的逻辑在 GET 和 POST 中各出现一次。严重性低（各 8 行），但是「业务逻辑在 route handler 里」这一更广泛模式的症状。

### 解决方案

归入候选 1 的自然延伸：`flattenTemplate` 函数放入模版领域模块，GET 和 POST 都委托给它。

---

## 附加发现

| # | 问题 | 涉及文件 |
|---|------|----------|
| A | `toPinyinInitials()` 定义在 `src/lib/pinyin.ts` 但从未被任何文件 import——死代码 | `src/lib/pinyin.ts` |
| B | 评价颜色映射（痊愈=绿、加重=红…）在 prescriptions/page 和 patients/[id]/page 中重复定义 | 2 个 page 文件 |
| C | `new Date().toLocaleString("zh-CN", {...})` 日期格式化在 4 个位置重复 | 4 个 page 文件 |
| D | `DialogContent` 的 `borderRadius: "var(--radius-xl-val)"` 内联样式在 3 个 page 中重复 | patients、herbs、inventory |
| E | 主开方页 `(main)/page.tsx` 为一个 557 行单体组件，含 11 个 `useState`——未拆分子组件 | `(main)/page.tsx` |
| F | export route 一次性加载全库数据到内存，无分页、无流式、无缓存头 | `api/export/route.ts` |

---

## 首要推荐

**候选 1：将领域逻辑从 route handler 中提取到 `src/services/`。**

这是解开一切的深化。当前 13 个 route handler 各自承担校验、Prisma 调用和错误处理。提取领域函数——`createHerb`、`createPrescription`、`stockIn`——在 HTTP 与业务逻辑之间建立真正的 seam。

**建议从 `herbs` 开始**——接口最清晰（`create`、`update`、`delete`、`importCsv`），是建立模式的最佳起点。建立后推广到 patients、templates、prescriptions、inventory。

候选 2（CSV 解析器）和候选 5（模版 reshape）自然归入此方案。候选 3（unitCost 快照）是数据模型变更，领域模块可透明吸收。候选 4（数据获取 hook）是独立的前端深化——在建立后端 seam 后再处理。
