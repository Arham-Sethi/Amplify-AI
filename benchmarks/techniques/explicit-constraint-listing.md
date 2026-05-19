# explicit-constraint-listing

## What it does
Surfaces the implicit constraints in the user's prompt ("polite", "professional", "not too long") and converts each into a testable, measurable directive.

## When to apply
- Categories: `vague_instruction`, `task_only` (when the original prompt has hand-wavy quality words)
- Intents: any
- Targets: all

## When NOT to apply
- The user's prompt is already explicit and testable.

## Snippet to inject (template)
```
Constraints (each must hold in the output):
- {constraint 1, e.g. "≤ 200 words"}
- {constraint 2, e.g. "no marketing jargon"}
- {constraint 3, e.g. "addresses the reader as 'you', not 'one'"}
- ...

If any constraint conflicts with the task, prefer the task and note the conflict at the end of the response.
```

## Example transformation
_TODO — fill from eval corpus._
