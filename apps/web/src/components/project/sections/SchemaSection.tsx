/**
 * Schema configuration section.
 * Tabs for input and output schema with Monaco editor.
 */

import { useFormContext } from 'react-hook-form';
import { useState } from 'react';
import { SchemaEditor } from '../SchemaEditor';

type SchemaTab = 'input' | 'output';

export function SchemaSection() {
  const { watch, setValue } = useFormContext();
  const [activeTab, setActiveTab] = useState<SchemaTab>('output');

  const inputSchema = watch('input_schema') || {};
  const outputSchema = watch('output_schema') || {};

  const handleInputSchemaChange = (value: object) => {
    setValue('input_schema', value, { shouldDirty: true });
  };

  const handleOutputSchemaChange = (value: object) => {
    setValue('output_schema', value, { shouldDirty: true });
  };

  const inferFromSample = () => {
    // Placeholder - would call API to infer schema from sample data
    const sampleSchema = {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Input text to annotate' },
        metadata: {
          type: 'object',
          properties: {
            source: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
      required: ['text'],
    };
    setValue('input_schema', sampleSchema, { shouldDirty: true });
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="schema-tabs">
        <button
          type="button"
          className={`schema-tab ${activeTab === 'output' ? 'active' : ''}`}
          onClick={() => setActiveTab('output')}
        >
          Output Schema
          <span className="schema-tab-badge required">Required</span>
        </button>
        <button
          type="button"
          className={`schema-tab ${activeTab === 'input' ? 'active' : ''}`}
          onClick={() => setActiveTab('input')}
        >
          Input Schema
          <span className="schema-tab-badge">Optional</span>
        </button>
      </div>

      {/* Schema Editor */}
      <div className="schema-editor-container">
        {activeTab === 'output' ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Define the structure of annotation output. This schema validates all annotations.
            </p>
            <SchemaEditor
              value={outputSchema}
              onChange={handleOutputSchemaChange}
              height="350px"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Define expected input data structure. Used for validation when importing tasks.
              </p>
              <button
                type="button"
                onClick={inferFromSample}
                className="btn btn-sm btn-outline"
              >
                Infer from Sample
              </button>
            </div>
            <SchemaEditor
              value={inputSchema}
              onChange={handleInputSchemaChange}
              height="350px"
            />
          </div>
        )}
      </div>

      {/* Schema Templates */}
      <div className="schema-templates">
        <p className="text-sm font-medium text-gray-700 mb-2">Quick Templates:</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="schema-template-btn"
            onClick={() => handleOutputSchemaChange({
              type: 'object',
              properties: {
                label: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
              },
              required: ['label'],
            })}
          >
            Classification
          </button>
          <button
            type="button"
            className="schema-template-btn"
            onClick={() => handleOutputSchemaChange({
              type: 'object',
              properties: {
                entities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      text: { type: 'string' },
                      label: { type: 'string' },
                      start: { type: 'integer' },
                      end: { type: 'integer' },
                    },
                    required: ['text', 'label', 'start', 'end'],
                  },
                },
              },
              required: ['entities'],
            })}
          >
            NER / Span Labeling
          </button>
          <button
            type="button"
            className="schema-template-btn"
            onClick={() => handleOutputSchemaChange({
              type: 'object',
              properties: {
                annotations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                      width: { type: 'number' },
                      height: { type: 'number' },
                      label: { type: 'string' },
                    },
                    required: ['x', 'y', 'width', 'height', 'label'],
                  },
                },
              },
              required: ['annotations'],
            })}
          >
            Bounding Box
          </button>
        </div>
      </div>
    </div>
  );
}
