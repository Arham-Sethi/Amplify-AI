# xml-tag-scaffolding

## What it does
Wraps each conceptual section of the prompt (context, task, examples, constraints) in named XML tags so the model can attend to them independently.

## When to apply
- Categories: `context_heavy`, `multi_step_workflow`, `role_persona`
- Intents: any prompt with ≥3 distinct sections
- Targets: `anthropic` (strongly preferred — Claude is RLHF'd on this), `openai` (acceptable), `xai` (acceptable)

## When NOT to apply
- Targets: `google` (Gemini prefers labelled markdown sections — see `best-practices/google.md`).
- Trivial single-task prompts where the structure is overhead.

## Snippet to inject (template)
```
<context>
{context blocks, possibly compressed}
</context>

<task>
{the user's task statement, made specific}
</task>

<constraints>
- {constraint 1}
- {constraint 2}
</constraints>

<output_format>
{format spec from rubric layer L3}
</output_format>
```

## Example transformation
_TODO — fill from eval corpus._
