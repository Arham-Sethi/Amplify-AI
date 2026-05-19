# few-shot

## What it does
Provides 2–5 input/output examples so the model anchors on a consistent format and tone.

## When to apply
- Categories: `task_only` (when format consistency is the bottleneck), `context_heavy` (when we want extraction in a stable shape)
- Intents: `classification`, `extraction`, `format_conversion`, `style_transfer`
- Targets: all

## When NOT to apply
- The user's prompt already includes examples (no double-shotting).
- Open-ended creative generation — examples can over-anchor and reduce variety.

## Snippet to inject (template)
```
Here are examples of the input → output mapping:

Example 1:
Input: ...
Output: ...

Example 2:
Input: ...
Output: ...

Now apply the same mapping to the user's input.
```

## Example transformation
_TODO — fill from eval corpus._
