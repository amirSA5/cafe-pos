const KEY = "cafe_pos_auth_v1";

export function getAuth() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuth(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function clearAuth() {
  localStorage.removeItem(KEY);
}
