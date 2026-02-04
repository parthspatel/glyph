/**
 * Change Handler Generation
 *
 * Auto-generates change handlers for component output bindings.
 * Convention: on{FieldName}Change writes to output.{fieldName}
 */

/**
 * Create a change handler for a specific field.
 */
export function createChangeHandler(
  fieldName: string,
  setOutput: (field: string, value: unknown) => void
): (value: unknown) => void {
  return (value: unknown) => {
    setOutput(fieldName, value);
  };
}

/**
 * Auto-generate handlers for multiple output fields.
 *
 * @example
 * const handlers = createHandlers(['entities', 'labels'], setOutput);
 * // Returns: { onEntitiesChange: fn, onLabelsChange: fn }
 */
export function createHandlers(
  outputFields: string[],
  setOutput: (field: string, value: unknown) => void
): Record<string, (value: unknown) => void> {
  const handlers: Record<string, (value: unknown) => void> = {};

  for (const field of outputFields) {
    const handlerName = `on${capitalizeFirst(field)}Change`;
    handlers[handlerName] = createChangeHandler(field, setOutput);
  }

  return handlers;
}

/**
 * Extract the output field name from a binding path.
 *
 * @example
 * extractOutputField('output.entities') // 'entities'
 * extractOutputField('input.text') // null
 */
export function extractOutputField(bindingPath: string): string | null {
  if (!bindingPath.startsWith('output.')) return null;
  return bindingPath.slice(7); // Remove "output."
}

/**
 * Check if a binding path is an output binding.
 */
export function isOutputBinding(bindingPath: string): boolean {
  return bindingPath.startsWith('output.');
}

/**
 * Parse all bindings from a props object and identify output bindings.
 */
export function parseBindings(props: Record<string, unknown>): {
  inputBindings: string[];
  outputBindings: string[];
} {
  const inputBindings: string[] = [];
  const outputBindings: string[] = [];

  for (const [, value] of Object.entries(props)) {
    if (typeof value === 'string') {
      if (value.startsWith('output.')) {
        outputBindings.push(extractOutputField(value)!);
      } else if (
        value.startsWith('input.') ||
        value.startsWith('context.') ||
        value.startsWith('config.')
      ) {
        inputBindings.push(value);
      }
    }
  }

  return { inputBindings, outputBindings };
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
