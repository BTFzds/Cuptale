# Vercel 部署（修复部署失败）

## 失败原因（你这次的报错）

1. **Application Preset 选成了 Other** → 请改成 **Next.js**
2. 仓库原先本地用 **SQLite 文件库**，Vercel 无持久磁盘，构建里的 `prisma db push` 会失败
3. Vercel 上通常还没配 **`DATABASE_URL`**（Neon 连接串）

现已改为 **PostgreSQL（Neon）**。

## 按这个顺序操作

### 1. 在 Vercel 创建 Neon 数据库

1. 打开 [Vercel Dashboard](https://vercel.com/dashboard) → 你的项目（或先 Import）
2. **Storage** → **Create Database** → 选 **Neon** → 创建
3. 创建后会自动（或手动）把 `DATABASE_URL` / `POSTGRES_URL` 接到项目  
   - 若变量名是 `POSTGRES_PRISMA_URL` 或 `POSTGRES_URL`，请再加一条：  
     **Name:** `DATABASE_URL`  
     **Value:** 复制同一条 Postgres 连接串（带 `sslmode=require`）

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
