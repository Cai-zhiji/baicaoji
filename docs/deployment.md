# 百草计 — 阿里云轻量服务器部署指南

> 适用环境：阿里云轻量应用服务器 · Ubuntu 22.04 LTS  
> 技术栈：Next.js 16 + SQLite + Prisma + PM2 + Nginx  
> 最后更新：2026-07-10

---

## 目录

1. [服务器初始化](#1-服务器初始化)
2. [环境安装](#2-环境安装)
3. [代码部署](#3-代码部署)
4. [数据库配置](#4-数据库配置)
5. [构建与启动](#5-构建与启动)
6. [Nginx 反向代理](#6-nginx-反向代理)
7. [HTTPS 证书](#7-https-证书)
8. [PM2 进程守护](#8-pm2-进程守护)
9. [日常运维](#9-日常运维)
10. [故障排查](#10-故障排查)

---

## 1. 服务器初始化

### 1.1 阿里云轻量服务器基本配置

- **镜像**：Ubuntu 22.04 LTS
- **配置建议**：2 核 2GB 内存起步（Next.js 构建需要至少 1GB 空闲内存）
- **防火墙**：在阿里云控制台 → 安全组/防火墙 中开放以下端口：
  - `22` (SSH)
  - `80` (HTTP)
  - `443` (HTTPS)

### 1.2 SSH 登录

```bash
ssh root@<服务器公网IP>
```

### 1.3 创建非 root 用户（推荐）

```bash
adduser baicaoji
usermod -aG sudo baicaoji
su - baicaoji
```

### 1.4 系统更新

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw build-essential
```

---

## 2. 环境安装

### 2.1 Node.js 20 LTS

```bash
# 使用 NodeSource 官方源
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证
node --version   # 应输出 v20.x.x
npm --version
```

### 2.2 PM2 进程管理

```bash
sudo npm install -g pm2
pm2 --version
```

### 2.3 Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# 验证：浏览器访问 http://<服务器IP> 应看到 Nginx 欢迎页
```

### 2.4 SQLite（已随 Prisma 内置，无需额外安装）

Prisma + libsql adapter 直接读写 SQLite 文件，无需安装系统级 SQLite。确认一下即可：

```bash
sqlite3 --version  # 可选，用于手动排查数据库问题
```

---

## 3. 代码部署

### 3.1 上传项目

**方式一：Git 克隆（推荐）**

```bash
# 在服务器上
cd /home/baicaoji
git clone <你的仓库地址> baicaoji
cd baicaoji
```

**方式二：scp 上传**

```bash
# 在本地机器上
cd /path/to/百草计
# 排除 node_modules、.next、prisma/dev.db
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude 'prisma/dev.db' \
  ./ root@<服务器IP>:/home/baicaoji/baicaoji/
```

### 3.2 安装依赖

```bash
cd /home/baicaoji/baicaoji
npm ci --omit=dev   # 生产环境：只装运行时依赖
```

> **注意**：如果服务器内存 < 2GB，构建时可能需要 devDependencies：
> ```bash
> npm ci                    # 安装全部依赖（含 devDependencies 用于构建）
> ```

### 3.3 目录结构确认

部署后关键路径：

```
/home/baicaoji/baicaoji/
├── prisma/
│   ├── schema.prisma      # 数据模型
│   └── dev.db             # SQLite 数据库文件（构建后生成）
├── public/                # 静态资源（PWA 图标、manifest 等）
├── .env                   # 环境变量（需手动创建）
├── package.json
├── next.config.ts
└── node_modules/
```

---

## 4. 数据库配置

### 4.1 创建生产环境变量

在项目根目录创建 `.env` 文件：

```bash
nano /home/baicaoji/baicaoji/.env
```

填入以下内容：

```bash
# /home/baicaoji/baicaoji/.env

# SQLite 数据库路径（绝对路径，确保 PM2 能找到）
DATABASE_URL=file:/home/baicaoji/baicaoji/prisma/dev.db

# 会话加密密钥（至少 32 位随机字符串）
SESSION_SECRET=<生成方式见下方>

# 登录账号（自定义）
ADMIN_USERNAME=<你的账号名>

# 登录密码的 bcrypt 哈希（生成方式见下方，不要填明文密码）
ADMIN_PASSWORD_HASH=<bcrypt 哈希值>
```

> ⚠️ `DATABASE_URL` 必须使用**绝对路径**。PM2 的工作目录可能与项目目录不同，相对路径 `file:./dev.db` 会导致找不到数据库。

#### 4.1.1 生成 SESSION_SECRET

```bash
openssl rand -base64 32
```

将输出的字符串（如 `kX7mP2qR...`）填入 `SESSION_SECRET=` 后面。

#### 4.1.2 设置登录账号和密码

百草计使用**单账号认证**，账号和密码通过环境变量配置，不在数据库中存储。密码必须以 bcrypt 哈希形式写入，不能直接填明文。

**步骤 1：生成密码的 bcrypt 哈希**

```bash
node -e "const {hashSync}=require('bcryptjs');console.log(hashSync('你想用的密码',10))"
```

例如你想设置密码为 `mypassword123`，则执行：

```bash
node -e "const {hashSync}=require('bcryptjs');console.log(hashSync('mypassword123',10))"
```

输出类似 `$2b$10$7snwoMLslppW8342uPR4yeAr/9.0WSLjvap/iHzC4L7VT8jJg1KTS`，复制这个值。

**步骤 2：填入 .env**

```bash
ADMIN_USERNAME=你的账号名        # 例如：zhangsan
ADMIN_PASSWORD_HASH=$2b$10$...   # 上一步生成的完整哈希
```

> ⚠️ `ADMIN_PASSWORD_HASH` 是 bcrypt 哈希，**不是明文密码**。如果你直接填明文密码，登录将永远失败。

**步骤 3：登录时使用**

部署完成后，打开网站，在登录页输入：
- 账号：你在 `ADMIN_USERNAME` 中设置的值
- 密码：你在生成哈希时输入的原始密码（不是哈希值）

#### 4.1.3 完整 .env 示例

```bash
DATABASE_URL=file:/home/baicaoji/baicaoji/prisma/dev.db
SESSION_SECRET=kX7mP2qR8vL5nJ3wY6aB9dE1fH4gT7sM0cV2xZ5uI8oP3rA6dC9
ADMIN_USERNAME=zhangsan
ADMIN_PASSWORD_HASH=$2b$10$7snwoMLslppW8342uPR4yeAr/9.0WSLjvap/iHzC4L7VT8jJg1KTS
```

#### 4.1.4 修改密码

后续如需修改账号或密码，直接编辑 `.env` 文件中的 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD_HASH`，然后重启应用：

```bash
pm2 restart baicaoji
```

### 4.2 生成 Prisma Client 并初始化数据库

```bash
npx prisma generate
npx prisma db push
```

验证：

```bash
ls -l prisma/dev.db    # 应看到 SQLite 数据库文件
```

### 4.3 数据库备份（建议配置 cron）

```bash
# 创建备份脚本
cat > /home/baicaoji/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=/home/baicaoji/backups
mkdir -p $BACKUP_DIR
cp /home/baicaoji/baicaoji/prisma/dev.db \
   $BACKUP_DIR/dev-$(date +%Y%m%d-%H%M%S).db
# 只保留最近 30 个备份
ls -t $BACKUP_DIR/dev-*.db | tail -n +31 | xargs -r rm
EOF

chmod +x /home/baicaoji/backup-db.sh

# 每天凌晨 3 点自动备份
(crontab -l 2>/dev/null; echo "0 3 * * * /home/baicaoji/backup-db.sh") | crontab -
```

---

## 5. 构建与启动

### 5.1 构建生产版本

```bash
cd /home/baicaoji/baicaoji
npm run build
```

构建产物在 `.next/` 目录。⚠️ 构建需要较多内存（~800MB-1.5GB），2GB 内存服务器应足够。如果构建失败（OOM），临时增加 swap：

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
# 构建完成后可移除：
# sudo swapoff /swapfile && sudo rm /swapfile
```

### 5.2 手动测试启动

在配置 PM2 之前，先手动验证：

```bash
cd /home/baicaoji/baicaoji
npm run start
# 默认监听 localhost:3000
```

另开一个终端验证：

```bash
curl http://localhost:3000
# 应返回 HTML 页面
```

Ctrl+C 停止测试。

---

## 6. Nginx 反向代理

### 6.1 创建站点配置

```bash
sudo nano /etc/nginx/sites-available/baicaoji
```

写入以下配置（先使用 HTTP，证书配置后再改为 HTTPS）：

```nginx
server {
    listen 80;
    server_name _;   # 替换为你的域名，如 example.com

    # 日志
    access_log /var/log/nginx/baicaoji-access.log;
    error_log  /var/log/nginx/baicaoji-error.log;

    # 客户端上传大小限制（CSV 导入用）
    client_max_body_size 10m;

    # 反向代理到 Next.js
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

        # Next.js 长轮询支持（HMR 开发用，生产环境可保留）
        proxy_read_timeout 60s;
    }

    # PWA 静态资源缓存优化
    location /icon- {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    location /manifest.json {
        expires 1d;
        add_header Cache-Control "public";
    }
    location /sw.js {
        expires 1d;
        add_header Cache-Control "public";
        add_header Service-Worker-Allowed "/";
    }
}
```

### 6.2 启用站点

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/baicaoji /etc/nginx/sites-enabled/

# 删除默认站点
sudo rm /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重载
sudo systemctl reload nginx
```

### 6.3 配置域名（当有域名时）

编辑 `/etc/nginx/sites-available/baicaoji`，将 `server_name _;` 改为：

```nginx
server_name example.com www.example.com;
```

然后 `sudo nginx -t && sudo systemctl reload nginx`。

---

## 7. HTTPS 证书

有了域名后，使用 Let's Encrypt 免费证书：

```bash
# 安装 certbot
sudo apt install -y certbot python3-certbot-nginx

# 自动获取证书并修改 Nginx 配置
sudo certbot --nginx -d example.com -d www.example.com

# 证书自动续期（certbot 会自动添加 systemd timer）
sudo certbot renew --dry-run   # 测试自动续期
```

Certbot 会自动将 Nginx 配置升级为 HTTPS（添加 443 端口监听和证书路径）。

---

## 8. PM2 进程守护

### 8.1 创建 PM2 启动配置

```bash
cat > /home/baicaoji/baicaoji/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'baicaoji',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/home/baicaoji/baicaoji',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // 自动重启配置
      max_memory_restart: '512M',
      // 日志
      error_file: '/home/baicaoji/logs/baicaoji-error.log',
      out_file: '/home/baicaoji/logs/baicaoji-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // 开机自启需要下面的步骤
    },
  ],
};
EOF

# 创建日志目录
mkdir -p /home/baicaoji/logs
```

### 8.2 启动应用

```bash
cd /home/baicaoji/baicaoji
pm2 start ecosystem.config.js
pm2 save          # 保存进程列表，用于重启恢复
```

### 8.3 设置开机自启

```bash
pm2 startup systemd
# 执行上述命令输出的 sudo 命令（通常形如）：
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u baicaoji --hp /home/baicaoji
```

### 8.4 常用 PM2 命令

```bash
pm2 status              # 查看进程状态
pm2 logs baicaoji       # 查看实时日志
pm2 logs baicaoji --lines 100   # 最近 100 行日志
pm2 restart baicaoji    # 重启应用
pm2 stop baicaoji       # 停止应用
pm2 delete baicaoji     # 删除应用（重新部署时用）
pm2 monit               # 实时监控面板
```

---

## 9. 日常运维

### 9.1 更新部署流程

```bash
# 1. 拉取最新代码
cd /home/baicaoji/baicaoji
git pull origin main

# 2. 安装新依赖（如有）
npm ci --omit=dev

# 3. 数据库迁移（如有 schema 变更）
npx prisma generate
npx prisma db push

# 4. 构建
npm run build

# 5. 重启
pm2 restart baicaoji

# 6. 验证
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# 应输出 200
```

### 9.2 数据库备份（手动）

```bash
cp /home/baicaoji/baicaoji/prisma/dev.db \
   /home/baicaoji/backups/dev-$(date +%Y%m%d-%H%M%S).db
```

### 9.3 数据库恢复

```bash
# 停止应用
pm2 stop baicaoji

# 恢复备份
cp /home/baicaoji/backups/dev-20260710-030000.db \
   /home/baicaoji/baicaoji/prisma/dev.db

# 重启
pm2 start baicaoji
```

### 9.4 查看日志

```bash
# Nginx 访问日志
sudo tail -f /var/log/nginx/baicaoji-access.log

# 应用日志
pm2 logs baicaoji

# 系统日志
sudo journalctl -u nginx -f
```

### 9.5 监控磁盘空间

SQLite 数据库会随使用增长。单用户场景下通常 < 100MB。

```bash
df -h /home/baicaoji/
du -sh /home/baicaoji/baicaoji/prisma/dev.db
```

---

## 10. 故障排查

### 10.1 502 Bad Gateway

Nginx 能访问但 Next.js 没响应：

```bash
pm2 status                    # 确认 baicaoji 状态为 online
curl http://localhost:3000     # 确认 Next.js 监听正常
sudo nginx -t                  # 确认 Nginx 配置正确
```

### 10.2 构建失败 / 内存不足

```bash
# 查看内存使用
free -h

# 清理构建缓存后重试
rm -rf .next
NODE_OPTIONS="--max-old-space-size=1536" npm run build
```

### 10.3 数据库锁定

SQLite 单写锁。如果遇到 "database is locked"：

```bash
pm2 restart baicaoji   # 重启释放锁
```

### 10.4 端口被占用

```bash
sudo lsof -i :3000          # 查看谁占用了 3000 端口
sudo kill -9 <PID>          # 强制释放
```

### 10.5 Prisma Client 与数据库不一致

```bash
npx prisma generate
npx prisma db push
pm2 restart baicaoji
```

---

## 附录：部署清单

| 步骤 | 内容 | ✓ |
|------|------|---|
| 1 | 阿里云安全组开放 80/443 端口 | ☐ |
| 2 | 安装 Node.js 20 + PM2 + Nginx | ☐ |
| 3 | 上传代码 / Git clone | ☐ |
| 4 | `npm ci` 安装依赖 | ☐ |
| 5 | 创建 `.env` 文件（绝对路径 DATABASE_URL + SESSION_SECRET + 账号密码） | ☐ |
| 6 | `npx prisma generate && npx prisma db push` | ☐ |
| 7 | `npm run build` 构建生产版本 | ☐ |
| 8 | 配置 Nginx 反向代理 → `localhost:3000` | ☐ |
| 9 | 域名 DNS 解析 → 服务器 IP | ☐ |
| 10 | `certbot --nginx` 配置 HTTPS | ☐ |
| 11 | PM2 启动 + 保存进程列表 + 开机自启 | ☐ |
| 12 | 配置数据库自动备份 cron | ☐ |
| 13 | 浏览器访问验证 | ☐ |

部署前需要注意的一点：
当前 .env 中 DATABASE_URL=file:./dev.db 是相对路径，部署到服务器后需改为绝对路径 file:/home/baicaoji/baicaoji/prisma/dev.db，否则 PM2 可能找不到数据库文件。