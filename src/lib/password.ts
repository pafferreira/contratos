export async function hashPassword(password: string) {
  if (password.length === 0) {
    return "";
  }

  if (typeof window === "undefined" || !window.crypto?.subtle) {
    return password;
  }

  const data = new TextEncoder().encode(password);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
