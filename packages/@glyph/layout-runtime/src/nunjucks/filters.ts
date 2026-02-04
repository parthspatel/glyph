/**
 * Nunjucks Filters
 *
 * Common filters for template authors to use in layouts.
 */

import nunjucks from 'nunjucks';

/**
 * Add common filters to a Nunjucks environment.
 */
export function addFilters(env: nunjucks.Environment): void {
  // JSON stringify (for debugging)
  env.addFilter('json', (value: unknown, indent = 0) => {
    return JSON.stringify(value, null, indent);
  });

  // Safe access to nested properties
  env.addFilter(
    'get',
    (obj: Record<string, unknown> | null | undefined, path: string, defaultValue?: unknown) => {
      if (obj == null) return defaultValue;
      const parts = path.split('.');
      let current: unknown = obj;
      for (const part of parts) {
        if (current == null || typeof current !== 'object') {
          return defaultValue;
        }
        current = (current as Record<string, unknown>)[part];
      }
      return current ?? defaultValue;
    }
  );

  // Format date
  env.addFilter('date', (value: string | Date, format = 'short') => {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(date.getTime())) return '';

    if (format === 'short') return date.toLocaleDateString();
    if (format === 'long')
      return date.toLocaleDateString(undefined, { dateStyle: 'long' } as Intl.DateTimeFormatOptions);
    if (format === 'time') return date.toLocaleTimeString();
    return date.toISOString();
  });

  // Truncate text
  env.addFilter('truncate', (value: string, length = 100, suffix = '...') => {
    if (!value || value.length <= length) return value;
    return value.slice(0, length - suffix.length) + suffix;
  });

  // Pluralize
  env.addFilter('pluralize', (count: number, singular: string, plural?: string) => {
    return count === 1 ? singular : (plural ?? singular + 's');
  });

  // Highlight text (for search results)
  env.addFilter('highlight', (text: string, term: string) => {
    if (!text || !term) return text;
    const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
    return new nunjucks.runtime.SafeString(text.replace(regex, '<mark>$1</mark>'));
  });

  // Capitalize first letter
  env.addFilter('capitalize', (value: string) => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  });

  // Convert to array (useful for iteration)
  env.addFilter('toArray', (value: unknown) => {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    return [value];
  });
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
