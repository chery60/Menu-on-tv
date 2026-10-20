/** HTTP Basic Auth helpers for the internal tracker. Any username is accepted; the password must match. */

const BASIC_PREFIX = 'Basic ';

/** Compares two strings without returning early on the first difference. */
export function constantTimeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let difference = a.length ^ b.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return difference === 0;
}

/** Decodes base64 into UTF-8 text; returns null for malformed input. */
function decodeBase64Utf8(value: string): string | null {
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function checkBasicAuth(authorizationHeader: string | null, expectedPassword: string): boolean {
  if (!expectedPassword || !authorizationHeader?.startsWith(BASIC_PREFIX)) return false;

  const decoded = decodeBase64Utf8(authorizationHeader.slice(BASIC_PREFIX.length).trim());
  if (decoded === null) return false;

  const separator = decoded.indexOf(':');
  if (separator < 0) return false;

  return constantTimeEqual(decoded.slice(separator + 1), expectedPassword);
}
