/**
 * Nunjucks language definition for Monaco Editor.
 *
 * Provides syntax highlighting using Monarch tokenizer with support for:
 * - Template tags: {% ... %}
 * - Expressions: {{ ... }}
 * - Comments: {# ... #}
 * - Custom component extension
 */
import type * as Monaco from 'monaco-editor';

/**
 * Language configuration for bracket matching, auto-closing, etc.
 */
export const nunjucksLanguageConfig: Monaco.languages.LanguageConfiguration = {
  comments: {
    blockComment: ['{#', '#}'],
  },
  brackets: [
    ['{%', '%}'],
    ['{{', '}}'],
    ['{#', '#}'],
    ['[', ']'],
    ['(', ')'],
    ['{', '}'],
  ],
  autoClosingPairs: [
    { open: '{{', close: '}}' },
    { open: '{%', close: '%}' },
    { open: '{#', close: '#}' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '(', close: ')' },
    { open: '[', close: ']' },
    { open: '{', close: '}' },
  ],
  surroundingPairs: [
    { open: '{{', close: '}}' },
    { open: '{%', close: '%}' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '(', close: ')' },
    { open: '[', close: ']' },
  ],
  folding: {
    markers: {
      start: /\{%-?\s*(block|if|for|macro)\b/,
      end: /\{%-?\s*(endblock|endif|endfor|endmacro)\b/,
    },
  },
};

/**
 * Monarch tokenizer for Nunjucks syntax highlighting.
 */
export const nunjucksTokenProvider: Monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.njk',

  keywords: [
    'if',
    'elif',
    'else',
    'endif',
    'for',
    'endfor',
    'in',
    'block',
    'endblock',
    'extends',
    'include',
    'import',
    'from',
    'as',
    'macro',
    'endmacro',
    'call',
    'endcall',
    'set',
    'endset',
    'filter',
    'endfilter',
    'raw',
    'endraw',
    'component',
    'endcomponent',
    'not',
    'and',
    'or',
    'is',
    'true',
    'false',
    'none',
    'null',
    'with',
    'without',
    'context',
    'ignore',
    'missing',
  ],

  operators: ['==', '!=', '<=', '>=', '<', '>', '+', '-', '*', '/', '//', '%', '**', '~'],

  filters: [
    'abs',
    'batch',
    'capitalize',
    'center',
    'default',
    'd',
    'dictsort',
    'dump',
    'escape',
    'e',
    'first',
    'float',
    'forceescape',
    'groupby',
    'indent',
    'int',
    'join',
    'last',
    'length',
    'list',
    'lower',
    'nl2br',
    'random',
    'reject',
    'rejectattr',
    'replace',
    'reverse',
    'round',
    'safe',
    'select',
    'selectattr',
    'slice',
    'sort',
    'string',
    'striptags',
    'sum',
    'title',
    'trim',
    'truncate',
    'upper',
    'urlencode',
    'urlize',
    'wordcount',
    'wordwrap',
    // Custom Glyph filters
    'json',
    'get',
    'date',
    'pluralize',
    'highlight',
  ],

  tokenizer: {
    root: [
      // Comments {# ... #}
      [/\{#/, 'comment', '@comment'],

      // Block tags {% ... %}
      [/\{%-?/, { token: 'delimiter.block', next: '@block' }],

      // Expressions {{ ... }}
      [/\{\{-?/, { token: 'delimiter.expression', next: '@expression' }],

      // HTML tags
      [/<\/?[\w-]+/, 'tag', '@tag'],

      // Plain text
      [/[^<{]+/, ''],
    ],

    comment: [
      [/-?#\}/, 'comment', '@pop'],
      [/./, 'comment'],
    ],

    block: [
      [/-?%\}/, { token: 'delimiter.block', next: '@pop' }],

      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string_double'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/'/, 'string', '@string_single'],

      // Numbers
      [/\d+(\.\d+)?/, 'number'],

      // Identifiers and keywords
      [
        /[a-zA-Z_]\w*/,
        {
          cases: {
            '@keywords': 'keyword',
            '@default': 'variable',
          },
        },
      ],

      // Operators
      [/[|.]/, 'operator'],
      [/[=<>!+\-*/%]+/, 'operator'],

      // Brackets
      [/[()\[\]]/, 'bracket'],

      // Whitespace
      [/\s+/, ''],
    ],

    expression: [
      [/-?\}\}/, { token: 'delimiter.expression', next: '@pop' }],

      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string_double'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/'/, 'string', '@string_single'],

      // Numbers
      [/\d+(\.\d+)?/, 'number'],

      // Binding roots (special highlighting)
      [
        /\b(input|output|context|config|user)\b/,
        {
          cases: {
            '@default': 'variable.predefined',
          },
        },
      ],

      // Filters after pipe
      [
        /\|\s*([a-zA-Z_]\w*)/,
        {
          cases: {
            '$1@filters': ['operator', 'function'],
            '@default': ['operator', 'function'],
          },
        },
      ],

      // Other identifiers
      [
        /[a-zA-Z_]\w*/,
        {
          cases: {
            '@keywords': 'keyword',
            '@default': 'variable',
          },
        },
      ],

      // Operators
      [/[|.]/, 'operator'],
      [/[=<>!+\-*/%]+/, 'operator'],

      // Brackets
      [/[()\[\]]/, 'bracket'],

      // Whitespace
      [/\s+/, ''],
    ],

    string_double: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop'],
    ],

    string_single: [
      [/[^\\']+/, 'string'],
      [/\\./, 'string.escape'],
      [/'/, 'string', '@pop'],
    ],

    tag: [
      [/>/, 'tag', '@pop'],
      [/\/>/, 'tag', '@pop'],
      [/"[^"]*"/, 'attribute.value'],
      [/'[^']*'/, 'attribute.value'],
      [/[\w-]+(?=\s*=)/, 'attribute.name'],
      [/=/, 'delimiter'],
      [/\s+/, ''],
      // Handle Nunjucks inside attributes
      [/\{\{/, { token: 'delimiter.expression', next: '@expression' }],
    ],
  },
};

/**
 * Register Nunjucks language with Monaco.
 *
 * @param monaco - Monaco editor module
 */
export function registerNunjucksLanguage(monaco: typeof Monaco): void {
  // Register language
  monaco.languages.register({
    id: 'nunjucks',
    extensions: ['.njk', '.html.njk', '.nunjucks'],
    aliases: ['Nunjucks', 'njk'],
    mimetypes: ['text/x-nunjucks'],
  });

  // Set language configuration
  monaco.languages.setLanguageConfiguration('nunjucks', nunjucksLanguageConfig);

  // Set tokenizer
  monaco.languages.setMonarchTokensProvider('nunjucks', nunjucksTokenProvider);
}
