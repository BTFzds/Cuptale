import { ORDER_TOKENS_KEY } from "@/lib/constants";

export function getStoredOrderTokens(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ORDER_TOKENS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function addOrderToken(token: string) {
  const tokens = getStoredOrderTokens();
  if (!tokens.includes(token)) {
    tokens.unshift(token);
    localStorage.setItem(ORDER_TOKENS_KEY, JSON.stringify(tokens.slice(0, 40)));
  }
}
