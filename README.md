# 百草计 [![v0.7.0](https://img.shields.io/badge/version-0.7.0-4ade80?labelColor=166534)]() [![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)]() [![License: MIT](https://img.shields.io/badge/License-MIT-yellow)]()

面向中医从业者的轻量级 Web 应用：药材管理、药方计价、病人管理、库存与利润统计。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | Next.js 16 (App Router) + TypeScript |
| 样式 | Tailwind CSS 4 + shadcn/ui |
| 数据库 | SQLite + Prisma ORM |
| 认证 | 无（免登录直接访问） |
| PWA | Service Worker（仅生产环境） |
| 部署 | 阿里云轻量服务器 |

## 快速开始

```bash
# 安装依赖
npm install

# 初始化数据库
npx prisma db push

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

## 项目结构

```
百草计/
├── docs/                     # 规划文档
│   ├── PRD.md                # 产品需求文档
│   ├── CONTEXT.md            # 领域词汇表
│   ├── task_plan.md          # 开发计划
│   ├── findings.md           # 技术调研与踩坑记录
│   └── progress.md           # 进度日志
├── prisma/
│   └── schema.prisma         # 数据模型
├── public/
│   ├── manifest.json         # PWA 清单
│   ├── sw.js                 # Service Worker
│   └── icon-*.png            # PWA 图标
├── src/
│   ├── app/
│   │   ├── (main)/           # 主布局页面
│   │   │   ├── page.tsx              # 开方（首页）
│   │   │   ├── patients/             # 病人管理
│   │   │   ├── herbs/                # 药材管理
│   │   │   ├── prescriptions/        # 药方记录
│   │   │   ├── inventory/            # 库存管理
│   │   │   ├── stats/                # 统计
│   │   │   └── templates/            # 模版管理
│   │   ├── api/               # API 路由
│   │   │   ├── herbs/         # 药材 CRUD + CSV 导入
│   │   │   ├── patients/      # 病人 CRUD + CSV 导入
│   │   │   ├── prescriptions/ # 药方 CRUD
│   │   │   ├── templates/     # 模版 CRUD + CSV 导入 + 模版药材管理
│   │   │   ├── inventory/     # 库存记录
│   │   │   ├── follow-ups/    # 随访记录
│   │   │   ├── stats/         # 利润统计
│   │   │   └── export/        # 全量数据导出
│   │   └── globals.css        # 全局样式（竹素 v2.0 设计系统）
│   ├── components/
│   │   ├── layout/            # 布局组件（侧边栏、老年模式、主题切换、PWA 注册）
│   │   ├── ui/                # shadcn/ui 组件 + 共享业务组件
│   │   │   ├── sheet/         # 底部弹出面板
│   │   │   ├── dropdown-menu/ # 下拉菜单
│   │   │   ├── command/       # 搜索式命令面板
│   │   │   ├── popover/       # 弹出卡片
│   │   │   ├── tabs/          # 选项卡
│   │   │   ├── sonner/        # 顶部 Toast 通知
│   │   │   ├── empty-state/   # 空状态占位
│   │   │   ├── confirm-dialog/ # 确认弹窗
│   │   │   └── csv-import-button/ # CSV 导入按钮
│   │   ├── prescription/      # 药方组件（处方明细列表）
│   │   └── templates/         # 模版组件（药材管理、模版编辑面板）
│   ├── lib/                   # 工具函数 + 共享类型
│   │   ├── csv-import.ts      # CSV 解析引擎（统一导入流程）
│   │   ├── pinyin.ts          # 拼音转换
│   │   ├── search-tokens.ts   # 拼音首字母 + 汉字分词索引
│   │   ├── validate.ts        # 数据校验
│   │   ├── uow.ts             # 工作单元（事务协调器）
│   │   ├── use-api.ts         # API 请求 Hook
│   │   └── use-mutation.ts    # 通用变更 Hook
│   ├── services/              # 业务逻辑层
│   │   ├── herbs.ts           # 药材（CRUD + 库存联动）
│   │   ├── stock.ts           # 库存（扣减/退回/进货）
│   │   ├── prescriptions.ts   # 药方（开方事务 + 成本快照）
│   │   ├── templates.ts       # 模版（CRUD + DTO 序列化）
│   │   ├── stats.ts           # 统计（利润计算 + 药材排行）
│   │   └── errors.ts          # 错误处理（Prisma 错误分类）
│   └── generated/             # Prisma Client 生成目录
├── examples/                  # CSV 导入示例
│   ├── herbs-example.csv      # 药材导入示例
│   ├── patients-example.csv   # 病人导入示例
│   ├── templates-full.csv     # 模版导入示例（含 292 首经方）
│   └── 中药经方.csv           # 经方药材导入
├── CLAUDE.md                  # AI 辅助开发指引
├── AGENTS.md                  # 代理工具链配置
└── VERSION                    # 当前版本号
```

## 功能概览

### 开方（首页）
- 拼音/汉字搜索病人和药材（支持拼音首字母快速定位）
- 快速新建病人（弹窗输入，一键创建）
- 药材克数编辑，实时计算总价与成本
- 库存不足告警（标红提示）
- 模版加载：搜索并展开模版药材，一键填入
- 「再开」历史药方（复制药材组合后自定义克数）
- 下拉菜单/Sheet 面板：新增病人、选择模版均使用底部弹出面板，手机端体验友好

### 病人管理 `/patients`
- 增删改查，拼音搜索
- CSV 批量导入
- 同名病人自动归并

### 药材管理 `/herbs`
- 增删改查，拼音搜索 + A-Z 字母索引（拖拽滚动条快速定位）
- CSV 批量导入（自动跳过重复项，反馈导入结果）
- 库存色标：低库存药材以橙色/红色背景高亮

### 药方记录 `/prescriptions`
- 历史药方列表，按病人筛选
- 点击查看明细（药材、克数、单价、小计、成本）
- **复制药方**到剪贴板（纯文本格式，可直接粘贴分享）
- **再开**：基于历史药方快速开新方
- 随访评价（痊愈 / 显效 / 有效 / 无效 / 加重）
- **复制按钮**：药方单页一键复制所有明细

### 库存管理 `/inventory`
- 药材进货登记（自动带出药材名）
- 库存变动流水记录
- 库存色标：安全库存绿色 / 预警橙色 / 短缺红色
- 库存扣减（保存药方时自动执行，删除药方时自动退回）
- 统计卡片：总库存品种数、低库存告警汇总

### 统计 `/stats`
- 收入 / 成本 / 利润概览（支持按月/按季度筛选）
- 药材用量与利润排行
- 统计卡片：总收入、总成本、总利润、药方数量一目了然

### 模版管理 `/templates`
- 增删改查，A-Z 字母索引（拖拽滚动条快速定位）
- CSV 批量导入（支持克数单位转换：枚/片/升/合）
- 模版药材编辑：Sheet 面板内自由增删药材、调整克数
- 最近使用排序

### 老年模式
- 点击顶栏右侧图标切换
- 更大字号、更高对比度、更大触控区域
- 状态持久化到 localStorage

---

## CSV 导入格式

### 药材 CSV

| 列名（中文） | 列名（英文） | 必填 | 说明 |
|---|---|---|---|
| 名称 | name | ✅ | 药材中文名 |
| 售价 | sellPrice / price | — | 每克售价（元），默认 0 |
| 成本价 | costPrice / cost | — | 每克成本价（元），默认 0 |
| 单位 | unit | — | 非克单位的名称，如"枚""片" |
| 单位克数 | unitGrams | — | 1 单位 = 多少克 |

**示例：**

```csv
名称,售价,成本价
当归,0.35,0.22
黄芪,0.28,0.15
党参,0.42,0.30
大枣,0.05,0.03,枚,3
```

### 病人 CSV

| 列名（中文） | 列名（英文） | 必填 | 说明 |
|---|---|---|---|
| 姓名 | name | ✅ | 病人姓名 |
| 性别 | gender | — | "男" 或 "女"，默认 "男" |
| 年龄 | age | — | 整数，默认空 |
| 电话 / 联系电话 | phone | — | 联系电话，默认空 |

**示例：**

```csv
姓名,性别,年龄,电话
张三,男,35,13800138001
李四,女,28,
```

### 药方模版 CSV

| 列名 | 必填 | 说明 |
|---|---|---|
| 模版名称 / 名称 / name | ✅ | 模版名称 |
| 药材 / herbs / items | ✅ | 药材列表，用 `\|` 分隔，格式"药名 克数" |

**示例：**

```csv
模版名称,药材
补中益气汤,黄芪 15g|党参 10g|白术 10g|当归 8g|陈皮 6g|升麻 3g|柴胡 3g|甘草 5g
四君子汤,党参 12g|白术 12g|茯苓 12g|甘草 6g
桂枝汤,桂枝 10g|白芍 10g|甘草 6g|生姜 9g|大枣 12枚
```

> 模版中引用的药材必须在药材管理中已存在，不存在的药材会被跳过并提示。

> 💡 `examples/` 目录下提供了药材、病人、模版的 CSV 示例文件，以及含 292 首经方的模版批量导入文件，可直接参考使用。

---

## 环境变量

```bash
# .env
DATABASE_URL=file:./dev.db
PORT=3000              # 本地开发默认 3000，服务器部署改为实际端口（如 3002）
```

应用无需额外配置即可运行。如需指定数据库路径，修改 `DATABASE_URL` 即可。

---

## 开发命令

```bash
npm run dev          # 启动开发服务器（Turbopack）
npm run build        # 生产构建
npm start            # 启动生产服务器
npx prisma generate  # 生成 Prisma Client
npx prisma db push   # 同步数据库 schema
npx prisma studio    # 打开数据库管理界面
```

## 领域规则

- **免登录使用**：直接访问，无账号密码
- **病人以姓名为唯一标识**：同名自动归并
- **药方总价** = Σ(每味药材售价 × 克数)，精确到分；成本同步计算
- **药材搜索**：拼音首字母 + 汉字搜索
- **模版可存默认克数**：保存模版时自动记录当前克数
- **库存扣减**在保存药方时执行，删除药方时自动退回
- **价格快照**：开方时快照单价和成本价，后续药材调价不影响历史药方
- **库存联动**：每次库存变动自动生成 StockRecord 流水

## 架构

业务逻辑层按领域模块化：

```
Route Handler（HTTP 适配，薄层）
  → Service（领域逻辑，可测试）
    → Stock 模块（库存生命周期）
    → Prisma（数据访问）
```

- **uow.ts**：工作单元模式，封装数据库事务（开方事务 = 成本计算 → 价格快照 → 库存扣减）
- **stock.ts**：所有库存操作统一入口（扣减/退回/进货），支持事务
- **prescriptions.ts**：药方 CRUD + 开方事务编排
- **templates.ts**：模版 CRUD + DTO 序列化 + 模版药材管理
- **stats.ts**：利润聚合 + `roundToCent` 共享工具
- **csv-import.ts**：统一 CSV 解析引擎（药材/病人/模版共用文件读取、列映射、校验逻辑）
- **search-tokens.ts**：拼音首字母 + 汉字分词索引生成（支持高效搜索）
- **errors.ts**：Prisma 错误分类与用户友好提示

## 设计系统

百草计使用「竹素 v2.0」设计系统：翠玉绿主色 × 冷净微绿中性色 × 液态玻璃质感。详见 `src/app/globals.css`。

## 云端部署指南

本指南面向阿里云轻量应用服务器（Ubuntu 22.04），其他 Linux 发行版步骤类似。

---

### 1. 服务器准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 20（推荐使用 nvm）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 验证
node -v   # 应输出 v20.x.x
npm -v    # 应输出 10.x.x

# 安装 Nginx
sudo apt install nginx -y

# 安装 PM2（进程守护）
npm install -g pm2
```

---

### 2. 部署应用

```bash
# 克隆仓库
cd /home/admin
git clone <your-repo-url> baicaoji
cd baicaoji

# 安装依赖
npm ci

# 初始化数据库
npx prisma db push

# 构建生产版本
npm run build

# 用 PM2 启动
pm2 start npm --name "baicaoji" -- start
pm2 save
pm2 startup   # 设置开机自启
```

---

### 3. Nginx 反向代理

创建 Nginx 配置：

```bash
sudo nano /etc/nginx/sites-available/baicaoji
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或服务器 IP

    # 日志
    access_log /var/log/nginx/baicaoji-access.log;
    error_log  /var/log/nginx/baicaoji-error.log;

    # 客户端上传大小限制（CSV 导入）
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/baicaoji /etc/nginx/sites-enabled/
sudo nginx -t          # 检查配置
sudo systemctl reload nginx
```

---

### 4. 配置 HTTPS（推荐）

使用 Let's Encrypt 免费证书：

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx -y

# 自动获取证书并配置 Nginx
sudo certbot --nginx -d your-domain.com

# 证书会自动续期（已内置 systemd timer）
sudo systemctl status certbot.timer
```

---

### 5. 数据库备份

SQLite 数据库是单文件，备份很简单。添加定时备份脚本：

```bash
# 创建备份脚本
sudo nano /home/admin/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/admin/backups"
DB_PATH="/home/admin/baicaoji/prisma/dev.db"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"
cp "$DB_PATH" "$BACKUP_DIR/dev-$(date +%Y%m%d-%H%M%S).db"

# 删除 30 天前的旧备份
find "$BACKUP_DIR" -name "dev-*.db" -mtime +$RETENTION_DAYS -delete
```

```bash
chmod +x /home/admin/backup-db.sh

# 添加到 crontab（每天凌晨 2 点备份）
(crontab -l 2>/dev/null; echo "0 2 * * * /home/admin/backup-db.sh") | crontab -
```

> ⚠️ **注意**：SQLite 备份时需要保证数据库不被写入。PM2 单实例部署时，Node.js 单线程保证了这一点。若使用多实例负载均衡，需改用 `sqlite3` 命令的 `.backup` 方式。

---

### 6. 更新部署

每次推送新版本后，在服务器上执行：

```bash
cd /home/admin/baicaoji
git pull
npm ci
npx prisma db push   # 同步数据库结构变更
npm run build
pm2 reload baicaoji
```

可保存为脚本 `/home/admin/update.sh`：

```bash
#!/bin/bash
set -e
cd /home/admin/baicaoji
echo "📥 拉取最新代码..."
git pull
echo "📦 安装依赖..."
npm ci
echo "🗄️ 同步数据库..."
npx prisma db push
echo "🔨 构建..."
npm run build
echo "🔄 重启服务..."
pm2 reload baicaoji
echo "✅ 部署完成"
```

---

### 7. 常用运维命令

```bash
pm2 status              # 查看服务状态
pm2 logs baicaoji       # 查看实时日志
pm2 monit               # 实时监控面板
pm2 reload baicaoji     # 零停机重启

# Nginx
sudo systemctl status nginx
sudo nginx -t            # 检查配置
sudo tail -f /var/log/nginx/baicaoji-error.log
```

---

### 8. 防火墙配置

阿里云轻量服务器需在**控制台防火墙**放行以下端口：

| 端口 | 用途 |
|------|------|
| 22 | SSH |
| 80 | HTTP |
| 443 | HTTPS |

服务器本地防火墙（如有）：

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

### 9. 首次部署检查清单

- [ ] Node.js 20+ 已安装
- [ ] `npx prisma db push` 执行成功，数据库文件已生成
- [ ] `npm run build` 无错误
- [ ] PM2 已启动，`pm2 status` 显示 `online`
- [ ] Nginx 配置正确，域名/公网 IP 可访问
- [ ] HTTPS 证书已配置
- [ ] 数据库备份脚本已添加到 crontab
- [ ] 防火墙已放行 80、443 端口

---

### 进阶：Docker 部署

如需容器化部署：

```dockerfile
# Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
RUN apk add --no-cache sqlite

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
```

> Docker 部署需在 `next.config.ts` 中添加 `output: "standalone"`，并将 SQLite 数据库文件通过 volume 挂载到宿主机。

---

## License

MIT
