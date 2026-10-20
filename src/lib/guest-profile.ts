const GUEST_ID_KEY = "hush_guest_id";
const GUEST_NAME_KEY = "hush_guest_name";

export function getOrCreateGuestId() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
        : `g${Date.now().toString(36)}`;
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export function getGuestDisplayName() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(GUEST_NAME_KEY) || "";
}

export function setGuestDisplayName(name: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_NAME_KEY, name.trim());
}
