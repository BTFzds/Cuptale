import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError(error.errors[0]?.message || "参数无效", 400);
  }
  if (error instanceof Error && "status" in error) {
    const status = Number((error as Error & { status: number }).status) || 500;
    return jsonError(error.message, status);
  }
  console.error(error);
  return jsonError(error instanceof Error ? error.message : "服务器错误", 500);
}
