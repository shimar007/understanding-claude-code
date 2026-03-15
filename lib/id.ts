/**
 * Generate a compact, URL-safe unique ID.
 * Using crypto.randomUUID() which is available in Node 14.17+ and all modern browsers.
 * The prefix makes IDs self-describing in logs and debug output.
 */
export function generateId(prefix: string = ''): string {
  const uuid = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  return prefix ? `${prefix}_${uuid}` : uuid;
}
