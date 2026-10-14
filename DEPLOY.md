# Vercel 部署（修复部署失败）

## 失败原因（你这次的报错）

1. **Application Preset 选成了 Other** → 请改成 **Next.js**
2. 仓库原先本地用 **SQLite 文件库**，Vercel 无持久磁盘，构建里的 `prisma db push` 会失败
3. Vercel 上通常还没配 **`DATABASE_URL`**（Postgres 连接串）

现已改为 **PostgreSQL**（可用 **Prisma Postgres** 或 Neon）。

## Prisma Postgres 安装填写记录（CupTale）

### 画面 1 · Configuration and Plan
- **Region：** 选离用户近的即可；国内访问美东也可先用默认  
  `Washington, D.C., USA (East)` — 不必改
- **Plan：** 选 **Free**（家庭局够用）
- 点 **Continue**

### 画面 2 · Confirmation
- **Resource Name：** 默认 `prisma-postgres-...` 即可，或改成 `cuptale-db`
- 确认 Plan 仍是 Free → 点 **Create**

### 画面 3 · Connect a Project（最重要）
- **Project：** `cuptale`
- **Environments：** `Production, Preview`（保持）
- **Custom Prefix：** 必须改成 **`DATABASE`**（不要用 `STORAGE`）  
  右侧会拼出 **`DATABASE_URL`** —— 这是 Prisma / 本项目唯一认的变量名  
  若留成 `STORAGE`，会变成 `STORAGE_URL`，部署仍会因找不到 `DATABASE_URL` 失败
- **Sensitive：** 保持开启
- 点 **Connect**（不要 Skip）

### 画面 4 · 回到 Deploy 前
在项目 **Settings → Environment Variables** 再手动补：

| Name | 值 |
|------|-----|
| `ADMIN_PASSWORD` | 如 `offsip-home` |
| `ADMIN_SESSION_SECRET` | 长随机串 |
| `DEEPSEEK_API_KEY` | 你的 Key |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | `deepseek-flash` |

确认已有 `DATABASE_URL` 后，Framework 选 **Next.js**，再 **Deploy**。

## 按这个顺序操作（总览）

### 1. 创建数据库（Prisma Postgres 或 Neon）

按上方「Prisma Postgres 安装填写记录」操作；或 Storage → Neon 亦可。  
连接串环境变量名必须是 **`DATABASE_URL`**。

### 2. 补齐环境变量（Settings → Environment Variables）

| Name | 示例 / 说明 |
|------|-------------|
| `DATABASE_URL` | Neon 连接串（必须） |
| `ADMIN_PASSWORD` | 后台密码，如 `offsip-home` |
| `ADMIN_SESSION_SECRET` | 一长串随机字符 |
| `DEEPSEEK_API_KEY` | 你的 DeepSeek Key |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | `deepseek-flash` |
| `BLOB_READ_WRITE_TOKEN` | 可选；Storage → Blob 创建后填 |

Environment 勾选 Production / Preview。

### 3. Import / Redeploy 设置

- **Framework Preset:** `Next.js`（不要选 Other）
- Root Directory: `./`
- 保存后 **Redeploy**

### 4. 本地开发也改用同一条 Neon

把 Neon 的 `DATABASE_URL` 写进本地 `.env`（替换原来的 `file:./dev.db`），然后：

```bash
npx prisma db push
npm run db:seed
npm run dev
```
