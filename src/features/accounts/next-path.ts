const HOME = '/studio';

/** Where to go after signing in: only a path inside the owner app, so a crafted link can't send people to another site. */
export function safeNextPath(value: unknown): string {
  if (typeof value !== 'string' || value.length > 200) return HOME;
  if (!/^\/studio(?:[/?#]|$)/.test(value) || /[\\\u0000-\u001f]/.test(value) || value.includes('//')) return HOME;
  return value;
}
