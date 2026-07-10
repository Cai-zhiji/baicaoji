# Findings: 百草计

> 研究与发现记录。所有外部搜索、技术调研、踩坑记录均在此。

---

## 技术调研

### 1. Next.js PWA 方案
- **`next-pwa`**：社区主流方案，支持 workbox、离线缓存、自定义 service worker。
- **`@serwist/next`**：next-pwa 的继任者，更活跃维护，支持 Next.js 14+ App Router。
- **推荐**：`@serwist/next`（next-pwa 已停止维护）。

### 2. 拼音生成方案
- **`pinyin-pro`**：纯 TypeScript、支持多音字、词库完善、按需裁剪。推荐。
- 备选：自建 GB2312 一级字库映射表（约 3755 字），更轻量但覆盖不全。

### 3. NextAuth vs 自定义登录
- **需求**：单密码登录，非多用户体系。
- **方案对比**：
  - NextAuth.js：功能全但过重，引入不必要的 Provider/Callback 概念。
  - `iron-session`：加密 cookie session，轻量灵活，与 Next.js App Router 配合好。
  - Middleware + cookie：最简单，在 middleware 中检查 cookie，未登录跳转登录页。
- **推荐**：`iron-session`，兼顾安全性和简洁性。

### 4. SQLite 在服务端的注意事项
- Prisma + SQLite 不支持枚举类型（用 TEXT + 应用层校验）。
- SQLite 默认不支持 datetime 类型的精度，用 ISO 字符串存储。
- 单文件数据库，并发写入场景弱，但单人使用足够。
- 备份：直接复制 `.db` 文件即可，零停机。

### 5. shadcn/ui 组件选用清单
MVP 阶段需要的组件：
- `Input`、`Button`、`Table`、`Dialog`、`Select`、`Toast`（sonner）
- `Card`、`Badge`、`Sheet`（移动端侧边栏）、`Command`（搜索建议下拉）
- `Tabs`（统计页面）、`Popover`（日期选择）

---

## 领域发现

### 1. 同名病人归并
- 以姓名为唯一标识，但同名不同人的情况现实中存在（如"张三"）。
- 需弹窗提示："检测到同名病人 [张三]，是否合并到已有档案？"
- 用户可选择"合并"或"另存为新病人（附加标识信息）"。

### 2. 药材价格变动
- 药材市场价会波动，已开药方的明细需要快照开方时的单价（prescription_items.unitPrice）。
- 后续修改药材售价不影响历史药方的计价。

### 3. 库存扣减时机
- 在"保存药方"时扣减，而非"添加药材到药方"时。
- 避免用户中途取消开方导致的库存虚减。

### 4. 模版仅存药材
- 药方模版不存储克数，仅存储药材列表。
- 从药方保存为模版时，只提取 `herbId` 列表。

---

## 待确认
- [ ] 部署用域名是什么？（用户已有，开发时再确认）
- [ ] 是否需要深色模式？（PRD 未提及，默认不加）
- [ ] 阿里云服务器操作系统选什么？（推荐 Ubuntu 22.04 LTS）
