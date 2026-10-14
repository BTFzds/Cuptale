"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "登录失败");
      router.push("/admin/orders");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center">
      <BrandLogo size={72} />
      <form onSubmit={handleSubmit} className="card-surface mt-8 w-full max-w-sm space-y-4 p-6">
        <h1 className="font-display text-xl text-ink">管理员登录</h1>
        <input
          type="password"
          className="field"
          placeholder="输入后台密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <p className="text-sm text-red-700/80">{error}</p> : null}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "验证中…" : "进入后台"}
        </button>
      </form>
    </main>
  );
}
