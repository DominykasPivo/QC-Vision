/**
 * Search utilities for filtering tests
 */

/**
 * Tokenizes a search query into individual search terms
 */
export function tokenizeSearchQuery(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Creates a searchable string from test properties
 */
export function createSearchableText(
  fields: (string | number | null)[],
): string {
  return fields
    .map((field) => (field != null ? String(field) : ""))
    .join(" ")
    .toLowerCase();
}

/**
 * Checks if all tokens exist within the haystack text
 */
export function matchesAllTokens(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  return tokens.every((token) => haystack.includes(token));
}
