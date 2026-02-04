/**
 * TestDataSelector - Select or generate test data for workflow testing.
 * Supports: data source rows, custom JSON, and synthetic data generation.
 */
import { useState, useCallback, useMemo } from "react";
import { faker } from "@faker-js/faker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Database,
  FileJson,
  Sparkles,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import type { JSONSchema7 } from "json-schema";

// =============================================================================
// Types
// =============================================================================

interface TestDataSelectorProps {
  inputSchema?: JSONSchema7;
  dataSourceSample?: Record<string, unknown>[];
  onSelect: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

type DataSourceMode = "source" | "custom" | "synthetic";

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// =============================================================================
// Faker Schema Generator
// =============================================================================

function generateFromSchema(schema: JSONSchema7): unknown {
  if (!schema.type) {
    // If no type, try to infer from other properties
    if (schema.properties)
      return generateFromSchema({ ...schema, type: "object" });
    if (schema.items) return generateFromSchema({ ...schema, type: "array" });
    return null;
  }

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;

  switch (type) {
    case "string":
      return generateStringValue(schema);
    case "number":
    case "integer":
      return generateNumberValue(schema, type === "integer");
    case "boolean":
      return faker.datatype.boolean();
    case "array":
      return generateArrayValue(schema);
    case "object":
      return generateObjectValue(schema);
    case "null":
      return null;
    default:
      return null;
  }
}

function generateStringValue(schema: JSONSchema7): string {
  // Check format
  if (schema.format) {
    switch (schema.format) {
      case "email":
        return faker.internet.email();
      case "uri":
      case "url":
        return faker.internet.url();
      case "date":
        return faker.date.recent().toISOString().split("T")[0];
      case "date-time":
        return faker.date.recent().toISOString();
      case "uuid":
        return faker.string.uuid();
      case "hostname":
        return faker.internet.domainName();
      case "ipv4":
        return faker.internet.ipv4();
      case "ipv6":
        return faker.internet.ipv6();
    }
  }

  // Check enum
  if (schema.enum && schema.enum.length > 0) {
    return faker.helpers.arrayElement(schema.enum as string[]);
  }

  // Check pattern (simplified - just generate based on title/description)
  const title = (schema.title || "").toLowerCase();
  const desc = (schema.description || "").toLowerCase();

  if (title.includes("name") || desc.includes("name")) {
    if (title.includes("first") || desc.includes("first"))
      return faker.person.firstName();
    if (title.includes("last") || desc.includes("last"))
      return faker.person.lastName();
    return faker.person.fullName();
  }
  if (title.includes("email") || desc.includes("email"))
    return faker.internet.email();
  if (title.includes("phone") || desc.includes("phone"))
    return faker.phone.number();
  if (title.includes("address") || desc.includes("address"))
    return faker.location.streetAddress();
  if (title.includes("city") || desc.includes("city"))
    return faker.location.city();
  if (title.includes("country") || desc.includes("country"))
    return faker.location.country();
  if (title.includes("company") || desc.includes("company"))
    return faker.company.name();
  if (title.includes("url") || desc.includes("url"))
    return faker.internet.url();
  if (title.includes("description") || desc.includes("description"))
    return faker.lorem.sentence();
  if (title.includes("text") || desc.includes("text"))
    return faker.lorem.paragraph();
  if (title.includes("id") || desc.includes("id")) return faker.string.uuid();

  // Default: lorem word(s)
  const minLength = schema.minLength || 1;
  const maxLength = schema.maxLength || 50;
  return faker.lorem
    .words(Math.min(Math.ceil(maxLength / 8), 5))
    .slice(0, maxLength)
    .padEnd(minLength, "x");
}

function generateNumberValue(schema: JSONSchema7, isInteger: boolean): number {
  const min = schema.minimum ?? 0;
  const max = schema.maximum ?? 1000;

  if (isInteger) {
    return faker.number.int({ min: Math.ceil(min), max: Math.floor(max) });
  }
  return faker.number.float({ min, max, fractionDigits: 2 });
}

function generateArrayValue(schema: JSONSchema7): unknown[] {
  const minItems = schema.minItems ?? 1;
  const maxItems = schema.maxItems ?? 5;
  const count = faker.number.int({ min: minItems, max: maxItems });

  const itemSchema = schema.items as JSONSchema7 | undefined;
  if (!itemSchema) {
    return Array(count)
      .fill(null)
      .map(() => faker.lorem.word());
  }

  return Array(count)
    .fill(null)
    .map(() => generateFromSchema(itemSchema));
}

function generateObjectValue(schema: JSONSchema7): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const properties = schema.properties || {};
  const required = schema.required || [];

  for (const [key, propSchema] of Object.entries(properties)) {
    // Always generate required properties, randomly generate optional ones
    if (required.includes(key) || faker.datatype.boolean()) {
      result[key] = generateFromSchema(propSchema as JSONSchema7);
    }
  }

  return result;
}

// =============================================================================
// Validation
// =============================================================================

function validateAgainstSchema(
  data: unknown,
  schema: JSONSchema7,
): ValidationResult {
  const errors: string[] = [];

  // Basic type validation
  if (!schema.type) {
    return { valid: true, errors: [] };
  }

  const schemaTypes = schema.type
    ? Array.isArray(schema.type)
      ? schema.type
      : [schema.type]
    : [];
  const actualType = Array.isArray(data)
    ? "array"
    : data === null
      ? "null"
      : typeof data;

  if (
    schemaTypes.length > 0 &&
    !schemaTypes.includes(actualType as (typeof schemaTypes)[number])
  ) {
    errors.push(`Expected type ${schemaTypes.join(" or ")}, got ${actualType}`);
    return { valid: false, errors };
  }

  // Object validation
  if (actualType === "object" && schema.properties) {
    const obj = data as Record<string, unknown>;
    const required = schema.required || [];

    for (const key of required) {
      if (!(key in obj)) {
        errors.push(`Missing required property: ${key}`);
      }
    }

    for (const [key, value] of Object.entries(obj)) {
      const propSchema = schema.properties[key] as JSONSchema7 | undefined;
      if (propSchema) {
        const propResult = validateAgainstSchema(value, propSchema);
        errors.push(...propResult.errors.map((e) => `${key}: ${e}`));
      }
    }
  }

  // Array validation
  if (actualType === "array" && schema.items) {
    const arr = data as unknown[];
    const itemSchema = schema.items as JSONSchema7;

    if (schema.minItems && arr.length < schema.minItems) {
      errors.push(`Array must have at least ${schema.minItems} items`);
    }
    if (schema.maxItems && arr.length > schema.maxItems) {
      errors.push(`Array must have at most ${schema.maxItems} items`);
    }

    arr.forEach((item, index) => {
      const itemResult = validateAgainstSchema(item, itemSchema);
      errors.push(...itemResult.errors.map((e) => `[${index}]: ${e}`));
    });
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// Component
// =============================================================================

export function TestDataSelector({
  inputSchema,
  dataSourceSample = [],
  onSelect,
  onCancel,
}: TestDataSelectorProps) {
  const [mode, setMode] = useState<DataSourceMode>("custom");
  const [customJson, setCustomJson] = useState("{\n  \n}");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const [syntheticData, setSyntheticData] = useState<Record<
    string,
    unknown
  > | null>(null);

  // Parse custom JSON
  const parsedCustomData = useMemo(() => {
    try {
      const parsed = JSON.parse(customJson);
      setJsonError(null);
      return parsed;
    } catch (e) {
      setJsonError((e as Error).message);
      return null;
    }
  }, [customJson]);

  // Validate data against schema
  const validation = useMemo((): ValidationResult => {
    let data: unknown = null;

    switch (mode) {
      case "source":
        data = dataSourceSample[selectedSourceIndex] || null;
        break;
      case "custom":
        data = parsedCustomData;
        break;
      case "synthetic":
        data = syntheticData;
        break;
    }

    if (!data) {
      return { valid: false, errors: ["No data selected"] };
    }

    if (!inputSchema) {
      return { valid: true, errors: [] };
    }

    return validateAgainstSchema(data, inputSchema);
  }, [
    mode,
    dataSourceSample,
    selectedSourceIndex,
    parsedCustomData,
    syntheticData,
    inputSchema,
  ]);

  // Generate synthetic data
  const generateSynthetic = useCallback(() => {
    if (!inputSchema) {
      setSyntheticData({
        id: faker.string.uuid(),
        name: faker.person.fullName(),
      });
      return;
    }
    const generated = generateFromSchema(inputSchema) as Record<
      string,
      unknown
    >;
    setSyntheticData(generated);
  }, [inputSchema]);

  // Handle selection
  const handleSelect = useCallback(() => {
    let data: Record<string, unknown>;

    switch (mode) {
      case "source":
        data = (dataSourceSample[selectedSourceIndex] || {}) as Record<
          string,
          unknown
        >;
        break;
      case "custom":
        data = parsedCustomData || {};
        break;
      case "synthetic":
        data = syntheticData || {};
        break;
    }

    onSelect(data);
  }, [
    mode,
    dataSourceSample,
    selectedSourceIndex,
    parsedCustomData,
    syntheticData,
    onSelect,
  ]);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Select Test Data</CardTitle>
        <CardDescription>
          Choose how to provide input data for testing the workflow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={(v) => setMode(v as DataSourceMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger
              value="source"
              disabled={dataSourceSample.length === 0}
            >
              <Database className="mr-2 h-4 w-4" />
              Data Source
            </TabsTrigger>
            <TabsTrigger value="custom">
              <FileJson className="mr-2 h-4 w-4" />
              Custom JSON
            </TabsTrigger>
            <TabsTrigger value="synthetic">
              <Sparkles className="mr-2 h-4 w-4" />
              Synthetic
            </TabsTrigger>
          </TabsList>

          <TabsContent value="source" className="space-y-4">
            {dataSourceSample.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No data source configured. Add a data source to use sample
                  data.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select a row:</label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedSourceIndex === 0}
                    onClick={() =>
                      setSelectedSourceIndex((i) => Math.max(0, i - 1))
                    }
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-3 text-sm text-muted-foreground">
                    Row {selectedSourceIndex + 1} of {dataSourceSample.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      selectedSourceIndex >= dataSourceSample.length - 1
                    }
                    onClick={() =>
                      setSelectedSourceIndex((i) =>
                        Math.min(dataSourceSample.length - 1, i + 1),
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
                <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted p-4 text-xs">
                  {JSON.stringify(
                    dataSourceSample[selectedSourceIndex],
                    null,
                    2,
                  )}
                </pre>
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Enter JSON data:</label>
              <Textarea
                value={customJson}
                onChange={(e) => setCustomJson(e.target.value)}
                className="font-mono text-sm"
                rows={10}
                placeholder='{"key": "value"}'
              />
              {jsonError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Invalid JSON: {jsonError}</AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="synthetic" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Generate fake data based on the input schema
                </p>
                <Button variant="outline" size="sm" onClick={generateSynthetic}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate
                </Button>
              </div>
              {syntheticData ? (
                <pre className="max-h-48 overflow-auto rounded-md bg-muted p-4 text-xs">
                  {JSON.stringify(syntheticData, null, 2)}
                </pre>
              ) : (
                <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
                  <p className="text-sm text-muted-foreground">
                    Click "Generate" to create synthetic data
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Validation status */}
        <div className="flex items-center gap-2">
          {validation.valid ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">Data is valid</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-yellow-600">
                {validation.errors[0] || "Data may not match schema"}
              </span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={
              (mode === "custom" && !!jsonError) ||
              (mode === "synthetic" && !syntheticData)
            }
          >
            Use This Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
