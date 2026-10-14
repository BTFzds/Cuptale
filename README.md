# 杯叙 CupTale · 息盏 OffSip

家庭私人调酒点单与配方管理系统。移动端优先，分享链接即可点单；管理员经 `/admin` 管理酒品、订单与私人配方库。

## 本地启动

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

- 访客：http://localhost:3000
- 后台：http://localhost:3000/admin （默认密码见 `.env` 的 `ADMIN_PASSWORD`）

复制 `.env.example` 为 `.env` 并填写密钥。DeepSeek Key、管理员密码勿提交到 Git。

## 功能概览

- 访客：菜单卡片、详情（口味标签）、多杯点单、我的订单进度（自动/手动刷新）
- 暂停供应：灰显不可点
- 配方对访客隐藏
- 管理：酒品/配方分离、图片上传、DeepSeek 生成风味文案、订单看板与备料汇总

## Vercel 部署

1. 推送本仓库到 GitHub `BTFzds/Cuptale`
2. Vercel Import 时 Framework Preset 选 **Next.js**
3. 配置环境变量：
   - `DATABASE_URL`
   - `ADMIN_PASSWORD`
   - `ADMIN_SESSION_SECRET`
   - `DEEPSEEK_API_KEY`
   - `DEEPSEEK_BASE_URL=https://api.deepseek.com`
   - `DEEPSEEK_MODEL=deepseek-flash`
   - `BLOB_READ_WRITE_TOKEN`（Vercel Blob，推荐生产使用）
4. **生产数据库请用 Neon Postgres**（Vercel Storage → Neon）：
   - 将 [`prisma/schema.prisma`](prisma/schema.prisma) 中 `provider` 改为 `"postgresql"`
   - `DATABASE_URL` 设为 Neon 连接串（含 `sslmode=require`）
   - 部署后执行 `npx prisma db push`（或在 Vercel Build Command 加 `prisma db push && next build`）
5. 本地默认 SQLite（`file:./dev.db`）仅用于开发；无服务器磁盘持久化，勿在 Vercel 上继续用 SQLite。

## 品牌资源

Logo：`public/brand/offsip-logo.jpg`（已去除水印的息盏 OffSip 标识）

## Cursor 规则

项目约定见 `.cursor/rules/cuptale.mdc`。本地提示词库 `awesome-cursorrules-main/` 已 gitignore，不推送。
