import { spawn } from "node:child_process";
import { copyFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schema = join(root, "prisma", "schema.prisma");
const sqlite = join(root, "prisma", "schema.local.sqlite.prisma");
const postgres = join(root, "prisma", "schema.postgres.prisma");

const envText = readFileSync(join(root, ".env"), "utf8");
const url = envText.match(/DATABASE_URL\s*=\s*"?([^"\r\n]+)/)?.[1] || "";
const localSqlite = url.startsWith("file:");

if (localSqlite) {
  copyFileSync(sqlite, schema);
}

const prisma = spawn("npx", ["prisma", "generate"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

prisma.on("exit", (code) => {
  if (localSqlite) copyFileSync(postgres, schema);
  if (code) process.exit(code ?? 1);
  const next = spawn("npx", ["next", "dev"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  next.on("exit", (nextCode) => process.exit(nextCode ?? 0));
});
