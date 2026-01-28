# Clinical NER Annotation Layout v1

A named entity recognition layout for annotating clinical text with medical entities.

## Entity Types

| Type | Color | Shortcut | Description |
|------|-------|----------|-------------|
| Medication | Blue | 1 | Drug names, dosages, and formulations |
| Condition | Red | 2 | Diseases, symptoms, and diagnoses |
| Procedure | Green | 3 | Medical procedures and treatments |
| Anatomy | Orange | 4 | Body parts and anatomical structures |
| Measurement | Purple | 5 | Lab values, vital signs, and measurements |

## Usage

### Input Format

```json
{
  "text": "Patient presented with chest pain. Started on aspirin 81mg daily.",
  "documentId": "doc-123",
  "metadata": {
    "source": "EHR",
    "date": "2025-01-15"
  }
}
```

### Output Format

```json
{
  "entities": [
    {
      "id": "entity-1",
      "type": "condition",
      "start": 24,
      "end": 34,
      "text": "chest pain"
    },
    {
      "id": "entity-2",
      "type": "medication",
      "start": 47,
      "end": 60,
      "text": "aspirin 81mg"
    }
  ],
  "notes": "Clear case, no ambiguity"
}
```

## AI Suggestions

When AI suggestions are available, they appear in a dedicated panel below the text. Click on a suggestion to accept it, or annotate manually.

## Keyboard Shortcuts

- `1-5`: Select entity type
- `Escape`: Clear selection
- `Ctrl+Z`: Undo last annotation
- `Ctrl+Shift+Z`: Redo
