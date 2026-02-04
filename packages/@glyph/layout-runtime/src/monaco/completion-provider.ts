/**
 * Monaco completion provider for Nunjucks templates.
 *
 * Provides autocomplete for:
 * - Binding roots (input, output, context, config, user)
 * - Schema properties based on JSON Schema
 * - Component names and props
 * - Nunjucks keywords and filters
 */
import type * as Monaco from "monaco-editor";
import type { ComponentInterface } from "@glyph/components/interfaces";

/**
 * Context for generating completions.
 */
export interface CompletionContext {
  /** JSON Schema for input data */
  inputSchema?: Record<string, unknown>;
  /** JSON Schema for output data */
  outputSchema?: Record<string, unknown>;
  /** JSON Schema for context data */
  contextSchema?: Record<string, unknown>;
  /** Available component interfaces */
  componentInterfaces: Record<string, ComponentInterface>;
}

/**
 * Nunjucks completion provider for Monaco.
 */
export class NunjucksCompletionProvider
  implements Monaco.languages.CompletionItemProvider
{
  triggerCharacters = [".", "{", "%", " ", "|"];

  constructor(
    private monaco: typeof Monaco,
    private context: CompletionContext,
  ) {}

  provideCompletionItems(
    model: Monaco.editor.ITextModel,
    position: Monaco.Position,
  ): Monaco.languages.ProviderResult<Monaco.languages.CompletionList> {
    const lineContent = model.getLineContent(position.lineNumber);
    const textUntilPosition = lineContent.substring(0, position.column - 1);

    const inExpression = this.isInExpression(textUntilPosition);
    const inBlock = this.isInBlock(textUntilPosition);

    const suggestions: Monaco.languages.CompletionItem[] = [];

    if (inExpression) {
      this.addExpressionCompletions(
        suggestions,
        textUntilPosition,
        model,
        position,
      );
    }

    if (inBlock) {
      this.addBlockCompletions(suggestions, textUntilPosition, model, position);
    }

    return { suggestions };
  }

  private addExpressionCompletions(
    suggestions: Monaco.languages.CompletionItem[],
    text: string,
    model: Monaco.editor.ITextModel,
    position: Monaco.Position,
  ): void {
    // Check for filter completions after pipe
    const filterMatch = text.match(/\|\s*(\w*)$/);
    if (filterMatch) {
      this.addFilterCompletions(suggestions, filterMatch[1], model, position);
      return;
    }

    // Check for property access on binding roots
    const propertyMatch = text.match(
      /(input|output|context|config|user)\.(\w*)$/,
    );
    if (propertyMatch) {
      const [, root, partial] = propertyMatch;
      this.addPropertyCompletions(suggestions, root, partial, model, position);
      return;
    }

    // Check for nested property access
    const nestedMatch = text.match(
      /(input|output|context|config|user)((?:\.\w+)+)\.(\w*)$/,
    );
    if (nestedMatch) {
      const [, root, path, partial] = nestedMatch;
      this.addNestedPropertyCompletions(
        suggestions,
        root,
        path,
        partial,
        model,
        position,
      );
      return;
    }

    // Root variable completions when starting expression
    if (text.match(/\{\{-?\s*(\w*)$/)) {
      this.addRootCompletions(suggestions, model, position);
    }
  }

  private addBlockCompletions(
    suggestions: Monaco.languages.CompletionItem[],
    text: string,
    model: Monaco.editor.ITextModel,
    position: Monaco.Position,
  ): void {
    // Component name completion
    const componentMatch = text.match(/\{%-?\s*component\s+"(\w*)$/);
    if (componentMatch) {
      this.addComponentNameCompletions(
        suggestions,
        componentMatch[1],
        model,
        position,
      );
      return;
    }

    // Component prop completion
    const propsMatch = text.match(/\{%-?\s*component\s+"(\w+)"\s+(.*)$/);
    if (propsMatch) {
      this.addComponentPropCompletions(
        suggestions,
        propsMatch[1],
        propsMatch[2],
        model,
        position,
      );
      return;
    }

    // Keyword completions
    if (text.match(/\{%-?\s*(\w*)$/)) {
      this.addKeywordCompletions(suggestions, model, position);
    }
  }

  private addRootCompletions(
    suggestions: Monaco.languages.CompletionItem[],
    _model: Monaco.editor.ITextModel,
    _position: Monaco.Position,
  ): void {
    const roots = [
      { name: "input", detail: "Task input data (read-only)" },
      { name: "output", detail: "Annotation output (read-write)" },
      { name: "context", detail: "Layout context (read-only)" },
      { name: "config", detail: "Layout settings (read-only)" },
      { name: "user", detail: "Current user info (read-only)" },
    ];

    for (const root of roots) {
      suggestions.push({
        label: root.name,
        kind: this.monaco.languages.CompletionItemKind.Variable,
        detail: root.detail,
        insertText: root.name,
        sortText: `0_${root.name}`,
      } as Monaco.languages.CompletionItem);
    }
  }

  private addPropertyCompletions(
    suggestions: Monaco.languages.CompletionItem[],
    root: string,
    partial: string,
    model: Monaco.editor.ITextModel,
    position: Monaco.Position,
  ): void {
    const schema = this.getSchemaForRoot(root);
    if (!schema) return;

    const properties = this.getSchemaProperties(schema);
    for (const [name, prop] of Object.entries(properties)) {
      if (name.toLowerCase().startsWith(partial.toLowerCase())) {
        suggestions.push({
          label: name,
          kind: this.monaco.languages.CompletionItemKind.Property,
          detail: this.getTypeString(prop),
          documentation: (prop as Record<string, unknown>).description as
            | string
            | undefined,
          insertText: name,
          range: this.getReplaceRange(model, position, partial.length),
        } as Monaco.languages.CompletionItem);
      }
    }
  }

  private addNestedPropertyCompletions(
    suggestions: Monaco.languages.CompletionItem[],
    root: string,
    path: string,
    partial: string,
    model: Monaco.editor.ITextModel,
    position: Monaco.Position,
  ): void {
    const schema = this.getSchemaForRoot(root);
    if (!schema) return;

    // Navigate to nested schema
    const pathParts = path.split(".").filter(Boolean);
    let currentSchema: Record<string, unknown> | null = schema;

    for (const part of pathParts) {
      if (!currentSchema) break;
      const properties = this.getSchemaProperties(currentSchema);
      currentSchema = properties[part] as Record<string, unknown> | null;
    }

    if (!currentSchema) return;

    const properties = this.getSchemaProperties(currentSchema);
    for (const [name, prop] of Object.entries(properties)) {
      if (name.toLowerCase().startsWith(partial.toLowerCase())) {
        suggestions.push({
          label: name,
          kind: this.monaco.languages.CompletionItemKind.Property,
          detail: this.getTypeString(prop),
          insertText: name,
          range: this.getReplaceRange(model, position, partial.length),
        } as Monaco.languages.CompletionItem);
      }
    }
  }

  private addFilterCompletions(
    suggestions: Monaco.languages.CompletionItem[],
    partial: string,
    model: Monaco.editor.ITextModel,
    position: Monaco.Position,
  ): void {
    const filters = [
      { name: "default", detail: "Set default value", snippet: "default($1)" },
      { name: "escape", detail: "HTML escape", snippet: "escape" },
      { name: "safe", detail: "Mark as safe HTML", snippet: "safe" },
      { name: "json", detail: "JSON stringify", snippet: "json" },
      { name: "trim", detail: "Trim whitespace", snippet: "trim" },
      { name: "lower", detail: "Lowercase", snippet: "lower" },
      { name: "upper", detail: "Uppercase", snippet: "upper" },
      {
        name: "capitalize",
        detail: "Capitalize first letter",
        snippet: "capitalize",
      },
      { name: "title", detail: "Title case", snippet: "title" },
      {
        name: "truncate",
        detail: "Truncate text",
        snippet: "truncate(${1:50})",
      },
      { name: "join", detail: "Join array", snippet: 'join("${1:, }")' },
      { name: "first", detail: "First item", snippet: "first" },
      { name: "last", detail: "Last item", snippet: "last" },
      { name: "length", detail: "Get length", snippet: "length" },
      { name: "sort", detail: "Sort array", snippet: "sort" },
      { name: "reverse", detail: "Reverse array", snippet: "reverse" },
      {
        name: "date",
        detail: "Format date",
        snippet: 'date("${1:YYYY-MM-DD}")',
      },
      {
        name: "pluralize",
        detail: "Pluralize word",
        snippet: 'pluralize("${1:item}", "${2:items}")',
      },
      {
        name: "highlight",
        detail: "Highlight text",
        snippet: 'highlight("${1:term}")',
      },
      { name: "get", detail: "Get property", snippet: 'get("${1:key}")' },
    ];

    for (const filter of filters) {
      if (filter.name.toLowerCase().startsWith(partial.toLowerCase())) {
        suggestions.push({
          label: filter.name,
          kind: this.monaco.languages.CompletionItemKind.Function,
          detail: filter.detail,
          insertText: filter.snippet,
          insertTextRules:
            this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: this.getReplaceRange(model, position, partial.length),
        } as Monaco.languages.CompletionItem);
      }
    }
  }

  private addComponentNameCompletions(
    suggestions: Monaco.languages.CompletionItem[],
    partial: string,
    model: Monaco.editor.ITextModel,
    position: Monaco.Position,
  ): void {
    for (const [name, iface] of Object.entries(
      this.context.componentInterfaces,
    )) {
      if (name.toLowerCase().startsWith(partial.toLowerCase())) {
        suggestions.push({
          label: name,
          kind: this.monaco.languages.CompletionItemKind.Class,
          detail: `${iface.meta.category} component`,
          documentation: this.formatComponentDocs(iface),
          insertText: name,
          range: this.getReplaceRange(model, position, partial.length),
        } as Monaco.languages.CompletionItem);
      }
    }
  }

  private addComponentPropCompletions(
    suggestions: Monaco.languages.CompletionItem[],
    componentName: string,
    existingProps: string,
    _model: Monaco.editor.ITextModel,
    _position: Monaco.Position,
  ): void {
    const iface = this.context.componentInterfaces[componentName];
    if (!iface) return;

    // Parse already-used props
    const usedProps = new Set(
      [...existingProps.matchAll(/(\w+)=/g)].map((m) => m[1]),
    );

    for (const [propName, propDef] of Object.entries(iface.props)) {
      if (!usedProps.has(propName)) {
        const isRequired = propDef.required;
        suggestions.push({
          label: propName,
          kind: this.monaco.languages.CompletionItemKind.Property,
          detail: `${propDef.type}${isRequired ? " (required)" : ""}`,
          documentation: propDef.description,
          insertText: `${propName}=`,
          sortText: isRequired ? `0_${propName}` : `1_${propName}`,
        } as Monaco.languages.CompletionItem);
      }
    }
  }

  private addKeywordCompletions(
    suggestions: Monaco.languages.CompletionItem[],
    _model: Monaco.editor.ITextModel,
    _position: Monaco.Position,
  ): void {
    const keywords = [
      { name: "if", snippet: "if ${1:condition} %}$0{% endif" },
      { name: "for", snippet: "for ${1:item} in ${2:items} %}$0{% endfor" },
      { name: "set", snippet: "set ${1:var} = ${2:value}" },
      { name: "include", snippet: 'include "${1:template.njk}"' },
      { name: "block", snippet: "block ${1:name} %}$0{% endblock" },
      { name: "macro", snippet: "macro ${1:name}(${2:args}) %}$0{% endmacro" },
      {
        name: "component",
        snippet: 'component "${1:Name}" ${2:props} %}{% endcomponent',
      },
      { name: "extends", snippet: 'extends "${1:base.njk}"' },
      { name: "import", snippet: 'import "${1:macros.njk}" as ${2:macros}' },
      { name: "from", snippet: 'from "${1:macros.njk}" import ${2:macro}' },
      { name: "raw", snippet: "raw %}$0{% endraw" },
      { name: "filter", snippet: "filter ${1:filtername} %}$0{% endfilter" },
    ];

    for (const kw of keywords) {
      suggestions.push({
        label: kw.name,
        kind: this.monaco.languages.CompletionItemKind.Keyword,
        insertText: kw.snippet,
        insertTextRules:
          this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      } as Monaco.languages.CompletionItem);
    }
  }

  private isInExpression(text: string): boolean {
    const lastOpen = text.lastIndexOf("{{");
    const lastClose = text.lastIndexOf("}}");
    return lastOpen > lastClose;
  }

  private isInBlock(text: string): boolean {
    const lastOpen = text.lastIndexOf("{%");
    const lastClose = text.lastIndexOf("%}");
    return lastOpen > lastClose;
  }

  private getSchemaForRoot(root: string): Record<string, unknown> | null {
    switch (root) {
      case "input":
        return this.context.inputSchema ?? null;
      case "output":
        return this.context.outputSchema ?? null;
      case "context":
        return this.context.contextSchema ?? null;
      case "config":
        return null; // Config schema not provided
      case "user":
        // Built-in user schema
        return {
          type: "object",
          properties: {
            id: { type: "string", description: "User ID" },
            name: { type: "string", description: "Display name" },
            role: { type: "string", description: "User role" },
          },
        };
      default:
        return null;
    }
  }

  private getSchemaProperties(
    schema: Record<string, unknown>,
  ): Record<string, unknown> {
    if (schema.properties && typeof schema.properties === "object") {
      return schema.properties as Record<string, unknown>;
    }
    return {};
  }

  private getTypeString(schema: unknown): string {
    if (typeof schema !== "object" || !schema) return "unknown";
    const s = schema as Record<string, unknown>;
    if (s.type) return s.type as string;
    if (s.$ref) return (s.$ref as string).split("/").pop() || "ref";
    return "object";
  }

  private formatComponentDocs(iface: ComponentInterface): string {
    const required = Object.entries(iface.props)
      .filter(([, def]) => def.required)
      .map(([name]) => name);

    let docs = iface.meta.description || "";
    if (required.length > 0) {
      docs += `\n\nRequired: ${required.join(", ")}`;
    }
    return docs;
  }

  private getReplaceRange(
    _model: Monaco.editor.ITextModel,
    position: Monaco.Position,
    replaceLength: number,
  ): Monaco.IRange {
    return {
      startLineNumber: position.lineNumber,
      startColumn: position.column - replaceLength,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    };
  }
}

/**
 * Register the Nunjucks completion provider.
 */
export function registerCompletionProvider(
  monaco: typeof Monaco,
  context: CompletionContext,
): Monaco.IDisposable {
  return monaco.languages.registerCompletionItemProvider(
    "nunjucks",
    new NunjucksCompletionProvider(monaco, context),
  );
}
