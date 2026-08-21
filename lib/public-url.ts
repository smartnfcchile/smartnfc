export const PUBLIC_APP_ORIGIN = process.env.NODE_ENV === "development"
  ? (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")
  : "https://www.smartnfc.cl";

export function getPublicUrl(path: string) {
  return new URL(path, `${PUBLIC_APP_ORIGIN}/`).toString();
}
