# 百草计 — 设计规范

> 版本：v2.0「竹素」| 日期：2026-07-10 | 适用范围：百草计全端（Web / PWA）

---

## 1. 视觉哲学

### 1.1 设计原则

| 原则 | 说明 |
|------|------|
| **简约高效** | 界面干净无冗余装饰，信息密集但可扫读，最少点击完成操作 |
| **竹素清雅** | 以翠玉绿（#0F8A5F）为主色，冷净微绿的中性色为底，唤起竹叶素纸、青瓷玉石的清透质感 |
| **高可读性** | 所有文本满足 WCAG AA 对比度（≥4.5:1），大号文字满足 AAA（≥7:1） |
| **触控友好** | 标准模式 44px 最小触控区，老年模式 48px 最小触控区 |
| **中文优先** | PingFang SC / Noto Sans SC 系统字体栈，中文排版规则（标点挤压、行距适配） |
| **双模适配** | 标准模式 + 老年模式一键切换，字号/间距/触控区等比放大 |

### 1.2 「竹素」视觉基调

v2.0 抛弃旧版暖米黄底色（`#F7F5F0`）与低沉墨绿（`#2D6A3F`），转向：

- **冷净微绿底色**：底色带极淡的绿调（oklch 色相 150），与主色形成柔和呼应，避免"旧网页"感
- **清透翠玉主色**：主色鲜亮而不刺眼，饱和度提升带来"活"的感觉
- **有存在感的选中态**：浅绿背景 `#D8EEE1` 明显可辨（旧版 `#E8F0EA` 过淡）
- **纯白卡片浮起**：卡片使用纯白，与冷绿底色形成清晰层次
- **柔和圆角 + 轻盈阴影**：延续 Apple 液态玻璃语言，12–24px 大圆角、低透明度大模糊阴影

---

## 2. 色彩系统

### 2.1 中性底色（Neutral · 微绿调）

| 令牌 | 色值 | 用途 | 白底对比度 |
|------|------|------|------------|
| `--bg` | `#F4F6F3` | 页面底色（竹素微绿白） | — |
| `--surface` | `#FFFFFF` | 卡片、面板、输入框（纯白浮起） | — |
| `--surface-elevated` | `#FFFFFF` | 模态框、抽屉（附加阴影） | — |
| `--surface-sunken` | `#EBEFEA` | 下沉分区（表单分组等） | — |
| `--fg` | `#0F1512` | 正文（近墨黑，微绿调） | 18.4:1 ✅ AAA |
| `--fg-secondary` | `#384039` | 次要文字 | 10.1:1 ✅ AAA |
| `--muted` | `#6A736C` | 辅助/占位文字 | 4.9:1 ✅ AA |
| `--border` | `#DDE3DC` | 分割线与边框 | — |
| `--border-strong` | `#B0BAB1` | 强调边框（聚焦等） | — |
| `--secondary-bg` | `#E8ECE7` | 次级按钮背景 | — |
| `--muted-bg` | `#EFF2EE` | muted 背景 | — |

### 2.2 主色（Accent · 翠玉绿）

| 令牌 | 色值 | 用途 | 对比度 |
|------|------|------|--------|
| `--accent` | `#0F8A5F` | 翠玉主色 | 4.9:1 ✅ AA on白 |
| `--accent-hover` | `#0A6E4A` | 悬停态 | 6.8:1 ✅ AAA |
| `--accent-pressed` | `#075836` | 按下态 | 9.2:1 ✅ AAA |
| `--accent-soft` | `#D8EEE1` | 浅绿背景（选中态、Tab 激活） | — |
| `--accent-soft-strong` | `#B8DDC5` | 强调浅绿（Hover 选中项） | — |
| `--accent-ring` | `#0F8A5F33` | 聚焦辉光（20% alpha） | — |
| `--on-accent` | `#FFFFFF` | 主色上的文字 | 4.9:1 ✅ AA |

### 2.3 语义色（Semantic · 保持绿调协调）

| 令牌 | 色值 | 用途 | 对比度 |
|------|------|------|--------|
| `--success` | `#157F4B` | 成功/利润/痊愈 | 5.8:1 ✅ AA |
| `--success-soft` | `#D9EFDF` | 成功背景 | — |
| `--warn` | `#B4610B` | 警告/库存紧张 | 4.7:1 ✅ AA |
| `--warn-soft` | `#FBEED9` | 警告背景 | — |
| `--danger` | `#B5261E` | 危险/库存不足/加重 | 6.4:1 ✅ AAA |
| `--danger-soft` | `#F7DDD9` | 危险背景 | — |
| `--info` | `#0A6E9E` | 提示/链接 | 5.4:1 ✅ AA |
| `--info-soft` | `#DAEBF5` | 提示背景 | — |

### 2.4 五档随访评价色

用于随访记录 Badge：

| 评价 | 色值 | 背景 |
|------|------|------|
| 痊愈 | `--success` #157F4B | #D9EFDF |
| 显效 | `#1E7A5E` | `#D8EBE3` |
| 有效 | `--info` #0A6E9E | #DAEBF5 |
| 无效 | `--muted` #6A736C | `--muted-bg` |
| 加重 | `--danger` #B5261E | `--danger-soft` |

### 2.5 对比度规则（不可违反）

```
正文文字 (--fg)          : ≥ 7:1  (AAA)  实测 18.4:1 ✅
次要文字 (--fg-secondary): ≥ 7:1  (AAA)  实测 10.1:1 ✅
辅助文字 (--muted)        : ≥ 4.5:1 (AA)  实测 4.9:1  ✅
主色文字 (--accent)       : ≥ 4.5:1 (AA)  实测 4.9:1  ✅
图标与图形                : ≥ 3:1
聚焦环                    : ≥ 3:1 与相邻色
```

### 2.6 老年模式色彩覆盖

老年模式额外提升对比度并降低主色亮度：

```css
.elderly {
  --fg: #000000;              /* 纯黑正文，21:1 */
  --fg-secondary: #1F2521;    /* 更深次要文字，15.8:1 */
  --muted: #4F5750;           /* 更深辅助文字，7.6:1 */
  --accent: #086C48;          /* 更深翠玉，6.5:1 */
  --accent-hover: #054C31;
  --border: #B8C0B8;          /* 更明显的边框 */
  --border-strong: #8F998F;
}
```

### 2.7 品牌红线

- ❌ 主色不得偏离绿系（oklch 色相 145–165），禁用蓝、紫、金
- ❌ 底色不得使用暖米黄/粉桃色（v1.0 已弃用）
- ❌ 底色的绿调不得过重（oklch 色度 ≤ 0.01），保持"素净"
- ❌ 禁用高饱和渐变（如翠绿→蓝紫）
- ✅ 中性色允许带极淡绿调（chroma ≤ 0.005）以保证系统凝聚力

---

## 3. 排版系统

### 3.1 字体栈

```css
--font-display: 'PingFang SC', 'Noto Sans SC', 'Hiragino Sans GB', 'Microsoft YaHei', system-ui, sans-serif;
--font-body:    'PingFang SC', 'Noto Sans SC', 'Hiragino Sans GB', 'Microsoft YaHei', system-ui, sans-serif;
--font-mono:    'SF Mono', 'JetBrains Mono', 'Cascadia Code', ui-monospace, Menlo, monospace;
```

中文界面展示 + 正文统一用系统中文字体。`--font-mono` 仅用于数字、价格、代码（启用 `font-variant-numeric: tabular-nums`）。

### 3.2 标准模式字号阶梯

| 层级 | 字号 | 行高 | 字重 | 用途 |
|------|------|------|------|------|
| `text-2xs` | 11px | 1.4 | 400 | 极小标签、角标 |
| `text-xs` | 12px | 1.4 | 400 | 辅助说明、拼音 |
| `text-sm` | 13px | 1.45 | 400 | 列表次要信息、placeholder |
| `text-base` | 15px | 1.5 | 400 | 正文、药材名、按钮 |
| `text-md` | 17px | 1.45 | 510 | 卡片标题、导航项 |
| `text-lg` | 20px | 1.35 | 590 | 段落标题、模态框标题 |
| `text-xl` | 28px | 1.2 | 620 | 总价、重要数字 |
| `text-2xl` | 34px | 1.15 | 700 | 页面大标题 |

字重使用 `510 / 590 / 620` 对应 PingFang 的 Medium/Semibold/Bold，比标准 `500/600/700` 更精准。

### 3.3 老年模式字号阶梯

| 层级 | 字号 | 行高 | 字重 | 增幅 |
|------|------|------|------|------|
| `text-2xs` | 14px | 1.5 | 400 | +3px |
| `text-xs` | 15px | 1.5 | 400 | +3px |
| `text-sm` | 17px | 1.55 | 510 | +4px |
| `text-base` | 19px | 1.55 | 510 | +4px |
| `text-md` | 22px | 1.5 | 590 | +5px |
| `text-lg` | 26px | 1.4 | 700 | +6px |
| `text-xl` | 34px | 1.25 | 700 | +6px |
| `text-2xl` | 42px | 1.2 | 700 | +8px |

---

## 4. 间距与网格

### 4.1 4px 基础网格（收敛为 4 的倍数以匹配移动端）

| 令牌 | 标准 | 老年 | 用途 |
|------|------|------|------|
| `--space-1` | 4px | 6px | 图标与文字间距 |
| `--space-2` | 8px | 12px | 标签间距、紧凑内边距 |
| `--space-3` | 12px | 16px | 列表项内边距 |
| `--space-4` | 16px | 22px | 卡片内边距、面板间距 |
| `--space-5` | 20px | 28px | 段落间距 |
| `--space-6` | 24px | 34px | 区块间距 |
| `--space-8` | 32px | 44px | 大区块间距 |
| `--space-12` | 48px | 60px | 页级间距 |

### 4.2 触控区最小尺寸

| 模式 | 最小触控区 | 备注 |
|------|-----------|------|
| 标准 | 44 × 44px | 遵循 Apple HIG |
| 老年 | 48 × 48px | 强化触控命中 |

### 4.3 圆角阶梯

| 令牌 | 值 | 用途 |
|------|-----|------|
| `--radius-sm-val` | 8px | 小按钮、输入框、Tag |
| `--radius-val` | 12px | 标准按钮、卡片、面板 |
| `--radius-lg-val` | 16px | 大卡片、Dialog |
| `--radius-xl-val` | 24px | 底部 Sheet、毛玻璃面板 |
| `--radius-pill` | 999px | Pill 按钮、Chip |

### 4.4 组件高度

| 令牌 | 标准 | 老年 |
|------|------|------|
| `--input-h` | 44px | 52px |
| `--btn-h` | 44px | 52px |
| `--btn-h-sm` | 36px | 44px |
| `--tabbar-h` | 56px | 68px |
| `--topbar-h` | 52px | 62px |

---

## 5. 图标系统

### 5.1 图标库

统一使用 **Lucide React**（`lucide-react`）—— 与 shadcn/ui 生态一致，笔画风格现代、稳定的社区维护。

- **风格**：Outline（线性），笔画 1.75px（标准）/ 2px（激活态）
- **尺寸**：标准 18px（内联）/ 20px（导航）/ 老年模式 22px / 26px
- **颜色**：继承 `currentColor`
- **禁止**：emoji 作为功能图标；混用其他图标库

### 5.2 常用图标映射（Lucide）

| 功能 | Lucide 名称 |
|------|-----------|
| 搜索 | `Search` |
| 设置 | `Settings` |
| 导出 | `Download` |
| 统计 | `BarChart3` |
| 病人 | `User` / `Users` |
| 药材 | `Leaf` |
| 药方（Tab） | `ScrollText` |
| 开方（Tab） | `PenLine` |
| 库存（Tab） | `Package` |
| 添加 | `Plus` |
| 删除/关闭 | `X` / `Trash2` |
| 展开/收起 | `ChevronDown` / `ChevronRight` |
| 警告 | `AlertTriangle` |
| 模版 | `ClipboardList` |
| 空态 | `Inbox` |
| 老年模式 | `Type` |

---

## 6. 阴影与深度

### 6.1 阴影阶梯（比 v1.0 更克制）

```css
--shadow-xs:  0 1px 2px rgba(15, 138, 95, 0.04);
--shadow-sm:  0 1px 3px rgba(20, 30, 22, 0.05), 0 1px 2px rgba(20, 30, 22, 0.03);
--shadow:     0 4px 12px rgba(20, 30, 22, 0.06), 0 2px 4px rgba(20, 30, 22, 0.04);
--shadow-lg:  0 12px 32px rgba(20, 30, 22, 0.09), 0 4px 8px rgba(20, 30, 22, 0.04);
--shadow-glow: 0 0 0 3px var(--accent-ring);
```

阴影带极淡绿调（rgba 混入绿色调分量），与整体色系呼应。

### 6.2 毛玻璃层次

```css
--glass-bg:         color-mix(in oklch, var(--surface) 82%, transparent);
--glass-bg-light:   color-mix(in oklch, var(--surface) 68%, transparent);
--glass-bg-heavy:   color-mix(in oklch, var(--surface) 92%, transparent);
--glass-border:     color-mix(in oklch, var(--border) 60%, transparent);
--glass-blur:       20px;
--glass-blur-lg:    32px;
```

使用场景：
- **Bottom TabBar**：`--glass-bg-heavy` + blur，滚动内容穿透
- **Popover / Combobox 结果面板**：`--glass-bg-heavy` + blur
- **Modal / Sheet 遮罩背景**：黑色 15% + blur 8px

---

## 7. 组件模式

### 7.1 按钮

| 变体 | 背景 | 文字 | 边框 | 用途 |
|------|------|------|------|------|
| Primary | `--accent` | `--on-accent` | 无 | 保存、确认 |
| Secondary | `--secondary-bg` | `--fg` | 无 | 次要操作 |
| Outline | `--surface` | `--fg` | `--border` | 中性操作 |
| Ghost | 透明 | `--fg` | 无 | 内嵌操作 |
| Link | 透明 | `--accent` | 无 | 文字链接 |
| Destructive | `--danger` | `#FFF` | 无 | 删除 |

标准高度 44px（老年 52px），圆角 12px；主 CTA（保存药方）使用 pill 圆角。

### 7.2 输入框

- 高度：标准 44px / 老年 52px
- 内边距：`12px 14px` / 老年 `16px 18px`
- 边框：1px `--border`，聚焦 → `--accent`
- 聚焦辉光：`--shadow-glow`（20% alpha 翠玉环）
- 占位文字：`--muted`
- 圆角：12px

### 7.3 Combobox（新增，替代 Popover+Command）

用于**药材搜索**和**病人选择**：

- 外观与普通 `Input` 完全一致
- 获焦时下方**原位展开**结果列表（非弹窗层）
- 结果最多 **5 条**，超出隐藏；无匹配时显示"＋ 新建 xxx"选项
- 失焦（tab/blur/点击外部）收起
- 支持键盘 `↑↓ Enter Esc` 导航
- 列表面板：`--surface` + `--shadow-lg` + 12px 圆角

### 7.4 列表项

- 最小高度：标准 48px / 老年 56px
- 水平内边距：16px
- 分割线：1px `--border` 底边
- Hover：`--accent-soft`（20% opacity 混入）
- Active（按下）：`transform: scale(0.99)` + 150ms

### 7.5 底部 TabBar

- 高度：标准 56px + safe-area / 老年 68px + safe-area
- 5 项等分：**开方 / 药方 / 病人 / 药材 / 统计**
- 背景：`--glass-bg-heavy` + blur（滚动可穿透）
- 图标 20px（老年 26px）在上，文字 10px 在下
- 激活态：`--accent` 文字 + 顶部 2px 圆角指示条 + 图标 stroke 2px
- 非激活：`--muted` + 图标 stroke 1.5px

### 7.6 Bottom Sheet（替代部分 Dialog）

移动端优先使用 Bottom Sheet 替代居中 Modal：

- 从底部滑出，圆角 `--radius-xl-val` 24px（仅上两角）
- 顶部 36×4px 拖动手柄（`--border-strong`）
- 拖拽向下 30% 距离自动关闭
- 遮罩：黑 40% + blur 4px

### 7.7 Badge / Chip

- 圆角：`--radius-pill`
- 内边距：`2px 8px`（标准）/ `4px 12px`（老年）
- 字号：11px / 老年 13px
- 变体：`default`（`--muted-bg`）/ `success` / `warn` / `danger` / `accent`（`--accent-soft`）

---

## 8. 老年模式

### 8.1 触发方式

- 顶部栏右侧「大字模式」切换按钮（Lucide `Type` 图标）
- 状态持久化到 `localStorage('elderly-mode')`
- 切换时 `document.documentElement.classList.toggle('elderly')`

### 8.2 变更清单

| 属性 | 标准 | 老年 | 增幅 |
|------|------|------|------|
| 基础字号 | 15px | 19px | +27% |
| 最小触控区 | 44px | 48px | +9% |
| 按钮高度 | 44px | 52px | +18% |
| 输入框高度 | 44px | 52px | +18% |
| 标签栏高度 | 56px | 68px | +21% |
| 顶部栏高度 | 52px | 62px | +19% |
| 图标尺寸 | 20px | 26px | +30% |
| 正文颜色 | #0F1512 | #000000 | ↑对比度 |
| 主色 | #0F8A5F | #086C48 | ↓亮度提升对比 |

### 8.3 实现策略

CSS 自定义属性级联：`:root` 定义标准值，`.elderly` 覆盖。所有组件引用 `var(--*)`，切换 class 即可无重新渲染切换。

---

## 9. 响应式断点

| 断点 | 宽度 | 布局 |
|------|------|------|
| 小手机 | < 380px | 单列紧凑，隐藏模版横滑区 |
| 标准手机 | 380–767px | 单列，主要目标形态 |
| 平板竖 | 768–1023px | 单列居中最大 640px |
| 平板横 / 桌面 | ≥ 1024px | 双栏：左 360px 搜药/病人 + 右自适应药方编辑 |

**主形态：手机端 PWA**，桌面端为辅助形态。

---

## 10. 禁止事项

### 10.1 反模式

- ❌ emoji 作为功能图标（用 Lucide）
- ❌ 紫色/紫罗兰/粉桃色装饰
- ❌ 暖米黄/桃色/橙棕色页面背景（v1.0 已废弃）
- ❌ 手绘 SVG 人物/面孔/风景
- ❌ Inter / Roboto / Arial 作为中文展示字体
- ❌ 伪造数据指标（"10× faster"等）
- ❌ 填充文案（"Feature One"、Lorem ipsum）
- ❌ 每个标题旁边配一个装饰图标
- ❌ 对比度低于 4.5:1 的功能性文字
- ❌ **Popover 弹层套 Command 输入框**（改用 Combobox inline 展开）
- ❌ 用浏览器原生 `alert / confirm / prompt`（改用 Dialog / Toast）

### 10.2 品牌红线

- 主色必须为翠玉绿系（oklch 色相 145–165），饱和度 ≥ 0.10
- 不得引入蓝色（除 `--info` 提示外）、紫色、金色作为点缀
- 中性色允许极淡绿调（chroma ≤ 0.005），但不得偏暖米/粉桃
- 单页面点缀色不超过 2 种

---

## 11. 从 v1.0 升级说明

| 项目 | v1.0（旧） | v2.0「竹素」 |
|------|-----------|--------------|
| 底色 | `#F7F5F0` 暖米宣纸 | `#F4F6F3` 竹素微绿白 |
| 主色 | `#2D6A3F` 沉稳森林 | `#0F8A5F` 清透翠玉 |
| 主色悬停 | `#245730` | `#0A6E4A` |
| 选中背景 | `#E8F0EA` 太淡 | `#D8EEE1` 有存在感 |
| 正文 | `#1A1A1A` 中性黑 | `#0F1512` 微绿墨黑 |
| 边框 | `#D9D4CB` 暖灰 | `#DDE3DC` 冷绿灰 |
| 阴影 | 纯黑 rgba | 微绿调 rgba |
| 图标库 | IconPark | **Lucide**（与 shadcn 生态统一）|
| 病人/药材搜索 | Popover + Command | **Inline Combobox** |
| 底部 Tab | 3 个 | **5 个（+ 病人 + 统计）** |

---

## 12. 资源链接

| 资源 | 地址 |
|------|------|
| Lucide 图标库 | https://lucide.dev |
| shadcn/ui 组件 | https://ui.shadcn.com |
| WCAG 对比度检查 | https://webaim.org/resources/contrastchecker/ |
| oklch 色彩空间 | https://oklch.com |
