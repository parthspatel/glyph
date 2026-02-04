/**
 * Monaco hover provider for Nunjucks templates.
 *
 * Shows documentation when hovering over:
 * - Binding roots (input, output, context, config, user)
 * - Component names
 * - Nunjucks keywords and filters
 */
import type * as Monaco from "monaco-editor";
import type { ComponentInterface } from "@glyph/components/interfaces";

/**
 * Context for generating hover content.
 */
export interface HoverContext {
  /** Available component interfaces */
  componentInterfaces: Record<string, ComponentInterface>;
}

/**
 * Nunjucks hover provider for Monaco.
 */
export class NunjucksHoverProvider implements Monaco.languages.HoverProvider {
  constructor(
    private monaco: typeof Monaco,
    private context: HoverContext,
  ) {}

  provideHover(
    model: Monaco.editor.ITextModel,
    position: Monaco.Position,
  ): Monaco.languages.ProviderResult<Monaco.languages.Hover> {
    const word = model.getWordAtPosition(position);
    if (!word) return null;

    const lineContent = model.getLineContent(position.lineNumber);

    // Check for component name hover
    const componentHover = this.getComponentHover(lineContent, word, position);
    if (componentHover) return componentHover;

    // Check for binding root hover
    const bindingHover = this.getBindingHover(word, position);
    if (bindingHover) return bindingHover;

    // Check for keyword hover
    const keywordHover = this.getKeywordHover(word, position);
    if (keywordHover) return keywordHover;

    // Check for filter hover
    const filterHover = this.getFilterHover(lineContent, word, position);
    if (filterHover) return filterHover;

    return null;
  }

  private getComponentHover(
    lineContent: string,
    word: Monaco.editor.IWordAtPosition,
    position: Monaco.Position,
  ): Monaco.languages.Hover | null {
    // Check if word is after "component" in a block tag
    const componentMatch = lineContent.match(/component\s+"(\w+)"/);
    if (!componentMatch || word.word !== componentMatch[1]) return null;

    const iface = this.context.componentInterfaces[word.word];
    if (!iface) return null;

    return {
      contents: [
        { value: `**${iface.meta.name}** \`${iface.meta.category}\`` },
        { value: iface.meta.description },
        { value: this.formatPropsTable(iface) },
        { value: this.formatOutputsSection(iface) },
      ],
      range: new this.monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn,
      ),
    };
  }

  private getBindingHover(
    word: Monaco.editor.IWordAtPosition,
    position: Monaco.Position,
  ): Monaco.languages.Hover | null {
    const bindingDocs: Record<
      string,
      { title: string; description: string; properties: string }
    > = {
      input: {
        title: "Task Input",
        description: "Read-only data passed to the annotation task.",
        properties: "Access fields with `input.fieldName`",
      },
      output: {
        title: "Annotation Output",
        description:
          "Read-write object for storing annotation results. Components automatically sync changes.",
        properties: "Set fields with components bound to `output.fieldName`",
      },
      context: {
        title: "Layout Context",
        description:
          "Additional read-only data passed to the layout at render time.",
        properties: "Access fields with `context.fieldName`",
      },
      config: {
        title: "Layout Settings",
        description: "Configuration options defined in the layout settings.",
        properties: "Access settings with `config.settingName`",
      },
      user: {
        title: "Current User",
        description: "Information about the currently logged-in user.",
        properties:
          "`user.id` - User ID\n`user.name` - Display name\n`user.role` - User role",
      },
    };

    const docs = bindingDocs[word.word];
    if (!docs) return null;

    return {
      contents: [
        { value: `**${docs.title}**` },
        { value: docs.description },
        { value: docs.properties },
      ],
      range: new this.monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn,
      ),
    };
  }

  private getKeywordHover(
    word: Monaco.editor.IWordAtPosition,
    position: Monaco.Position,
  ): Monaco.languages.Hover | null {
    const keywordDocs: Record<string, { syntax: string; description: string }> =
      {
        if: {
          syntax: "{% if condition %}...{% elif %}...{% else %}...{% endif %}",
          description: "Conditional rendering based on expression evaluation.",
        },
        for: {
          syntax: "{% for item in items %}...{% else %}...{% endfor %}",
          description:
            "Iterate over arrays or objects. The `else` block renders when the collection is empty.",
        },
        set: {
          syntax: "{% set variable = value %}",
          description: "Assign a value to a variable in the template scope.",
        },
        block: {
          syntax: "{% block name %}...{% endblock %}",
          description:
            "Define a block that can be overridden by child templates.",
        },
        extends: {
          syntax: '{% extends "base.njk" %}',
          description: "Inherit from a parent template. Must be the first tag.",
        },
        include: {
          syntax: '{% include "partial.njk" %}',
          description: "Include another template at this location.",
        },
        macro: {
          syntax: "{% macro name(args) %}...{% endmacro %}",
          description: "Define a reusable template function.",
        },
        import: {
          syntax: '{% import "macros.njk" as macros %}',
          description: "Import macros from another template.",
        },
        component: {
          syntax: '{% component "Name" prop=value %}{% endcomponent %}',
          description:
            "Render a React component with the specified props. Glyph extension.",
        },
        raw: {
          syntax: "{% raw %}...{% endraw %}",
          description: "Output content without template processing.",
        },
      };

    const docs = keywordDocs[word.word];
    if (!docs) return null;

    return {
      contents: [
        { value: `**${word.word}**` },
        { value: "```nunjucks\n" + docs.syntax + "\n```" },
        { value: docs.description },
      ],
      range: new this.monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn,
      ),
    };
  }

  private getFilterHover(
    lineContent: string,
    word: Monaco.editor.IWordAtPosition,
    position: Monaco.Position,
  ): Monaco.languages.Hover | null {
    // Check if word is after a pipe (filter context)
    const beforeWord = lineContent.substring(0, word.startColumn - 1);
    if (!beforeWord.match(/\|\s*$/)) return null;

    const filterDocs: Record<string, { syntax: string; description: string }> =
      {
        default: {
          syntax: '{{ value | default("fallback") }}',
          description:
            "Returns the fallback value if the variable is undefined or null.",
        },
        escape: {
          syntax: "{{ value | escape }}",
          description: "HTML-escapes the value. Alias: `e`.",
        },
        safe: {
          syntax: "{{ value | safe }}",
          description: "Marks the value as safe, preventing auto-escaping.",
        },
        json: {
          syntax: "{{ value | json }}",
          description: "Converts value to JSON string. Glyph filter.",
        },
        trim: {
          syntax: "{{ value | trim }}",
          description: "Removes leading and trailing whitespace.",
        },
        truncate: {
          syntax: '{{ value | truncate(50, true, "...") }}',
          description: "Truncates text to specified length.",
        },
        join: {
          syntax: '{{ array | join(", ") }}',
          description: "Joins array elements with the specified separator.",
        },
        date: {
          syntax: '{{ value | date("YYYY-MM-DD") }}',
          description:
            "Formats a date using the specified format. Glyph filter.",
        },
        pluralize: {
          syntax: '{{ count | pluralize("item", "items") }}',
          description:
            "Returns singular or plural form based on count. Glyph filter.",
        },
        highlight: {
          syntax: '{{ value | highlight("term") }}',
          description: "Wraps matching text in highlight tags. Glyph filter.",
        },
        get: {
          syntax: '{{ object | get("nested.path") }}',
          description:
            "Gets a nested property by dot-notation path. Glyph filter.",
        },
      };

    const docs = filterDocs[word.word];
    if (!docs) return null;

    return {
      contents: [
        { value: `**${word.word}** filter` },
        { value: "```nunjucks\n" + docs.syntax + "\n```" },
        { value: docs.description },
      ],
      range: new this.monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn,
      ),
    };
  }

  private formatPropsTable(iface: ComponentInterface): string {
    const rows = Object.entries(iface.props).map(([name, def]) => {
      const required = def.required ? "✓" : "";
      const desc = def.description || "";
      return `| \`${name}\` | \`${def.type}\` | ${required} | ${desc} |`;
    });

    if (rows.length === 0) return "*No props*";

    return (
      "**Props:**\n| Name | Type | Required | Description |\n|------|------|:--------:|-------------|\n" +
      rows.join("\n")
    );
  }

  private formatOutputsSection(iface: ComponentInterface): string {
    // ComponentInterface uses callbacks, not outputs
    // Show callback signatures as "outputs" for documentation
    const callbacks = iface.callbacks as Record<string, unknown> | undefined;
    if (!callbacks || Object.keys(callbacks).length === 0) return "";

    const rows = Object.entries(callbacks).map(([name]) => {
      return `| \`${name}\` | callback | Event handler |`;
    });

    return (
      "**Callbacks:**\n| Name | Type | Description |\n|------|------|-------------|\n" +
      rows.join("\n")
    );
  }
}

/**
 * Register the Nunjucks hover provider.
 */
export function registerHoverProvider(
  monaco: typeof Monaco,
  context: HoverContext,
): Monaco.IDisposable {
  return monaco.languages.registerHoverProvider(
    "nunjucks",
    new NunjucksHoverProvider(monaco, context),
  );
}
