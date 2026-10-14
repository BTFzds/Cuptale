export const ORDER_STATUSES = ["pending", "making", "done"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "待备料",
  making: "制作中",
  done: "已完成",
};

export const ADMIN_COOKIE = "cuptale_admin";
export const ORDER_TOKENS_KEY = "cuptale_order_tokens";

export const TASTE_LEVELS = [1, 2, 3, 4, 5] as const;
