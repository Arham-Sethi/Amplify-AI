# explicit-format-block

## What it does
Names the exact output format the user wants (bullets / table / JSON / markdown / prose), with column or key names where applicable. Eliminates the "I had to ask twice" failure mode.

## When to apply
- Categories: `task_only`, `context_heavy`, `vague_instruction`
- Intents: any prompt where the user has even an implicit format expectation
- Targets: all

## When NOT to apply
- The user explicitly asked for "freeform" or "your choice" of format.

## Snippet to inject (template)
```
Format the response as {format}.
{If table: with columns: A, B, C.}
{If JSON: matching this schema: { ... }.}
{If bullets: at most {N} bullets, each one sentence.}
```

## Example transformation
_TODO — fill from eval corpus._
