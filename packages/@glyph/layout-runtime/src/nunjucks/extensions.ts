/**
 * Nunjucks Extensions
 *
 * Custom tags for rendering React components in Nunjucks templates.
 * Components are rendered as placeholders for client-side hydration.
 */

import nunjucks from "nunjucks";
import type { ComponentRegistry } from "../registry";
import type { SecurityConfig } from "./security";
import { validateComponent } from "./security";

// Nunjucks types are incomplete, so we use any for parser internals
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Custom tag for rendering React components in Nunjucks templates.
 *
 * Usage in template:
 * {% component "NERTagger" text=input.text entityTypes=config.entityTypes value=output.entities %}
 */
export class ComponentExtension implements nunjucks.Extension {
  tags = ["component"];

  constructor(
    private registry: ComponentRegistry,
    private security: SecurityConfig,
  ) {}

  parse(parser: any, nodes: any, _lexer: any) {
    const tok = parser.nextToken();
    const args = parser.parseSignature(null, true);
    parser.advanceAfterBlockEnd(tok.value);

    return new nodes.CallExtension(this, "run", args);
  }

  run(
    _context: unknown,
    componentName: string,
    props: Record<string, unknown> = {},
  ) {
    // Security check
    if (!validateComponent(componentName, this.security)) {
      return new nunjucks.runtime.SafeString(
        `<div class="p-4 bg-destructive/10 border border-destructive rounded-md">
          <p class="text-destructive">Component "${componentName}" not allowed</p>
        </div>`,
      );
    }

    // Check registry
    if (!this.registry.has(componentName)) {
      return new nunjucks.runtime.SafeString(
        `<div class="p-4 bg-destructive/10 border border-destructive rounded-md">
          <p class="text-destructive">Unknown component: "${componentName}"</p>
        </div>`,
      );
    }

    // Return placeholder for React hydration
    // The actual React component is rendered client-side
    const propsJson = JSON.stringify(props).replace(/'/g, "&#39;");
    return new nunjucks.runtime.SafeString(
      `<div data-component="${componentName}" data-props='${propsJson}'></div>`,
    );
  }
}

/**
 * Add the component extension to a Nunjucks environment.
 */
export function addComponentExtension(
  env: nunjucks.Environment,
  registry: ComponentRegistry,
  security: SecurityConfig,
): void {
  env.addExtension(
    "ComponentExtension",
    new ComponentExtension(registry, security),
  );
}
