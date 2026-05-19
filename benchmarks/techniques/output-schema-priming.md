# output-schema-priming

## What it does
Pre-declares the exact JSON / structured shape the consumer expects. Used when the next consumer of the output is a parser, not a human.

## When to apply
- Categories: `task_only`, `context_heavy`
- Intents: `extraction`, `classification`, `structured_summarisation`, `data_pipeline_step`
- Targets: all (`openai` JSON-mode is a stronger version of this; use both when available)

## When NOT to apply
- The output will be read by a human directly (use `explicit-format-block` instead).

## Snippet to inject (template)
```
Return ONLY a JSON object matching this schema. No prose, no markdown fences.

{
  "field_a": <type>,  // description
  "field_b": <type>,  // description
  ...
}

If a field cannot be determined from the input, use null.
```

## Example transformation
_TODO — fill from eval corpus._
