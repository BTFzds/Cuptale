# Vercel 部署清单（CupTale）

## 推送代码

```bash
git remote add origin git@github.com:BTFzds/Cuptale.git
git add .
git commit -m "feat: initial CupTale app"
git push -u origin main
```

（勿提交 `.env`；DeepSeek Key 若曾泄露请先轮换。）

## Vercel 项目设置

1. Import `BTFzds/Cuptale`，Framework Preset = **Next.js**
2. Build Command 使用仓库内 `vercel.json`（已含 `prisma db push`）
3. 环境变量：

| Name | 说明 |
|------|------|
| `DATABASE_URL` | Neon Postgres 连接串 |
| `ADMIN_PASSWORD` | 后台密码 |
| `ADMIN_SESSION_SECRET` | 长随机串 |
| `DEEPSEEK_API_KEY` | DeepSeek Key |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | `deepseek-flash` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob（生产强烈建议） |

## 数据库：Neon（必做）

本地开发用 SQLite。**上线前**把 [`prisma/schema.prisma`](prisma/schema.prisma) 中：

```prisma
provider = "sqlite"
```

改为：

```prisma
provider = "postgresql"
```

然后在 Neon / Vercel Storage 创建数据库，把连接串写入 `DATABASE_URL`，再 Deploy。

## 后台入口

生产域名下访问 `/admin`（访客导航不露出此链接）。

默认本地密码：`.env` 里的 `ADMIN_PASSWORD`（示例 `offsip-home`）。
