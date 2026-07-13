@AGENTS.md

# 百草计

面向中医从业者的轻量级 Web 应用：药材管理、药方计价、病人管理、库存与利润统计。

## 技术栈

- **前端**：Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **后端**：Next.js API Routes / Server Actions
- **数据库**：SQLite + Prisma ORM
- **认证**：无（免登录直接访问）
- **PWA**：@serwist/next
- **部署**：阿里云轻量服务器

## 项目结构

```
百草计/
├── docs/                # 规划文档
│   ├── PRD.md           # 产品需求文档
│   ├── CONTEXT.md       # 领域词汇表
│   ├── task_plan.md     # 开发计划（10 阶段）
│   ├── findings.md      # 技术调研与踩坑记录
│   └── progress.md      # 进度日志
├── src/                 # 源代码
├── prisma/              # 数据模型
├── public/              # 静态资源 & PWA 图标
├── VERSION              # 版本号文件（部署时用于判断部署完成）
├── package.json
└── CLAUDE.md
```

## 领域要点

- **单人使用**：无多用户、无权限体系
- **病人以姓名为唯一标识**：同名自动归并（弹窗确认）
- **药方总价** = Σ(每味药材售价 × 克数)，精确到分
- **药材搜索**：支持拼音首字母 + 汉字搜索
- **模版仅存药材组合**，不含克数
- **库存扣减**在保存药方时执行，非添加药材时
- **价格快照**：开方时快照单价到 prescription_items，后续药材调价不影响历史药方

## 版本号

`VERSION` 文件存储当前版本号（如 `0.1.2`），遵循 `major.minor.patch` 格式。部署时拉取该文件来判断部署是否完成（对比线上 VERSION 是否与最新提交一致）。

**每次提交 git 时必须同步更新 VERSION 文件**：
- 修复 bug → 递增 patch（0.1.2 → 0.1.3）
- 新增功能 → 递增 minor（0.1.2 → 0.2.0）
- 架构变更/破坏性改动 → 递增 major（0.1.2 → 1.0.0）

部署环境通过 HTTP 访问 `/VERSION` 即可获取当前部署的版本号。

## 开发命令

```bash
npm run dev          # 启动开发服务器
npx prisma generate  # 生成 Prisma Client
npx prisma db push   # 同步数据库 schema
npx prisma studio    # 打开数据库管理界面
```
