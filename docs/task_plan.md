# Task Plan: 百草计 — 中药计价 PWA 应用

## Goal
构建「百草计」—— 一款面向中医从业者的 Next.js 全栈 PWA 应用，实现药材管理、药方计价、病人管理、库存管理、利润统计，部署到阿里云轻量服务器。

## Current Phase
Phase 9 (PWA 完善与部署) — Phases 1-8 基本完成

## Phases

### Phase 1: 项目初始化与技术基础
- [x] 用 `create-next-app` 初始化 Next.js 项目（TypeScript）
- [x] 配置 Tailwind CSS + shadcn/ui
- [x] 配置 Prisma + SQLite，定义数据模型（8 张表：Herb, Patient, Prescription, PrescriptionItem, Template, TemplateItem, FollowUp, StockRecord）
- [ ] 配置 PWA（@serwist/next、manifest.json、service worker、图标）—— 已安装依赖但未配置
- [x] ~~实现简单密码登录~~ 已移除（2026-07-09：确认无需登录认证）
- [x] 搭建基础布局（导航栏、响应式容器、桌面侧边栏 + 移动端底部导航）
- [x] 拼音自动生成工具函数（pinyin-pro）
- **Status:** in_progress

### Phase 2: 药材管理
- [x] 药材 CRUD API（`/api/herbs`）
- [x] 药材列表页面（表格展示、搜索框）
- [x] 拼音首字母 + 汉字搜索（后端 LIKE 查询 + 前端实时过滤）
- [x] 新增/编辑药材表单
- [ ] CSV 批量导入（上传 → 解析 → 批量写入）
- [x] 删除确认弹窗
- **Status:** in_progress

### Phase 3: 病人管理
- [x] 病人 CRUD API（`/api/patients`）
- [x] 病人列表页面
- [x] 同名检测与归并逻辑（姓名唯一约束，保存时检测已有记录，返回 409 + 已有病人信息）
- [x] 新增/编辑病人表单
- **Status:** complete

### Phase 4: 药方计价（核心）
- [x] 药方 CRUD API（`/api/prescriptions`）
- [x] 开方主页面（左右分栏 / 手机上下布局）
  - 左侧：病人选择 + 药材搜索 + 模版加载
  - 右侧：药方明细表 + 实时总价
- [x] 药材搜索 → 点击加入药方 → 填入克数
- [x] 药方明细：药材名称、克数、单价、小计
- [x] 总价实时计算（前端即时 + 后端保存时校验）
- [x] 保存药方（关联病人、写入 prescription + prescription_items、事务中扣库存 + 写流水）
- [x] 保存时校验库存（库存不足提示，但不阻断——V1.3 强化）
- [ ] 历史药方查看（按病人筛选、按时间排序）—— API 支持但无独立页面
- **Status:** in_progress

### Phase 5: 药方模版
- [x] 模版 CRUD API（`/api/templates`）
- [x] 从已开药方"保存为模版"（提取药材列表，丢弃克数）
- [x] 模版列表展示
- [ ] CSV 批量导入模版
- [x] 加载模版 → 药材预填入药方 → 逐味填克数
- **Status:** in_progress

### Phase 6: 随访记录
- [ ] 随访 CRUD API（`/api/follow-ups`）
- [ ] 药方详情页 → 添加/查看随访记录
- [ ] 五档评价勾选 + 文字描述 + 自动记录时间
- [ ] 病人详情页 → 聚合展示历史药方及对应随访
- **Status:** pending（数据模型已定义，API 和页面待开发）

### Phase 7: 库存管理
- [x] 库存 CRUD API（`/api/inventory`）
- [x] 进货录入页面（选择药材 → 克数 → 进价 → 自动更新成本价）
- [x] 开方保存时自动扣减库存（事务保证）
- [x] 库存不足提示（药材列表 Badge 红色标记 + 低库存阈值 50g）
- [x] 库存流水记录（进货/扣减明细表，inventory 页面双 tab 展示）
- [x] 药材列表显示当前库存量
- **Status:** complete

### Phase 8: 利润统计
- [x] 统计 API（`/api/stats`）
- [x] 利润统计页面
  - 总营收、总成本、总利润、药方数 卡片展示
  - [ ] 时间筛选（本月/本季度/自定义）—— Tab 已建，数据逻辑待实现
  - [ ] 按药材维度的利润贡献
- [ ] 数据导出（JSON/CSV 下载，含药材、病人、药方、随访全量数据）
- **Status:** in_progress

### Phase 9: PWA 完善与部署
- [ ] 生成 PWA 图标（多尺寸：192x192, 512x512, maskable）
- [ ] manifest.json 配置（应用名"百草计"、全屏模式、主题色）
- [ ] Service Worker 注册与离线壳（@serwist/next 未安装配置）
- [ ] 响应式适配测试（桌面 + 平板 + 手机）—— 基础布局已完成，待全面测试
- [ ] 阿里云轻量服务器部署（Node.js + Nginx 反代 + SSL 证书）
- [ ] 最终验证：安装到桌面/手机主屏幕、完整功能走查
- **Status:** pending

### Phase 10: 可选增强（V2.0）
- [ ] 药方打印/导出 PDF
- [ ] 更多统计图表（月度趋势、药材使用频次）
- [ ] 库存预警阈值配置
- [ ] 操作日志
- **Status:** pending

## Key Questions
1. 拼音生成方案：用 `pinyin-pro` 库还是自建常用汉字映射表？（已选择 pinyin-pro）
2. ~~密码存储~~ 已移除登录认证
3. 同名病人处理：新建时检测到同名是弹窗提示合并，还是静默合并？（已实现：后端返回 409 + 已有病人信息）
4. CSV 导入格式：是否需要表头行？编码用 UTF-8？（待实现）

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Next.js App Router | 全栈能力、Server Actions 简化 API 调用、社区成熟 |
| SQLite + Prisma | 轻量免维护、单文件备份、Prisma 类型安全 |
| shadcn/ui | 基于 Radix + Tailwind、响应式友好、按需引入、不臃肿 |
| 拼音首字母搜索 | `pinyin-pro` 库，覆盖多音字、生僻字 |
| 简单密码登录 | 已移除 — 确认为单人使用无需登录 |
| PWA 在线为主 | 数据在服务端 SQLite，离线无意义，PWA 仅做安装体验 |
| 病人姓名唯一 | 同名自动归并，弹窗提示用户确认 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       |         |            |

## Notes
- PRD 和 CONTEXT.md 已在项目中，所有领域术语以 CONTEXT.md 为准
- 发布节奏：MVP (Phase 1-4) → V1.1 (Phase 5) → V1.2 (Phase 6,8) → V1.3 (Phase 7) → V2.0 (Phase 10)
- Phase 9（PWA + 部署）贯穿始终，MVP 完成后即可首次部署
- 每个 Phase 完成后更新状态：pending → in_progress → complete
- 遇到错误立即记录到 Errors Encountered 表格
- **2026-07-09 状态**：Phase 1-5, 7 基本完成（缺少 CSV 导入、历史药方页、PWA），Phase 6 未开始，Phase 8 部分完成
- 实际数据模型为 8 张表（PRD 5 张 + StockRecord），比 PRD 多了库存流水和模版明细独立表
- Prisma 使用 @prisma/adapter-libsql（Turso 兼容），实际存储为本地 SQLite dev.db
- PWA 选型从 next-pwa 改为 @serwist/next，但尚未实际安装配置
