# chain-of-thought

## What it does
Asks the model to externalise its reasoning before producing the final answer, improving accuracy on multi-step problems.

## When to apply
- Categories: `multi_step_workflow`, `debug_fix`, `vague_instruction` (when the resolution requires reasoning)
- Intents: `decision_recommendation_from_data`, `root_cause_analysis`, `tradeoff_analysis`
- Targets: `openai` (non-o-series), `anthropic`, `google`, `xai`

## When NOT to apply
- Reasoning-native models (`openai` o-series, `deepseek` R1) — they already CoT internally; adding it wastes tokens and may degrade output.
- Simple `task_only` prompts with a deterministic format.

## Snippet to inject (template)
```
Before producing the final answer, work through the problem step by step
inside <thinking>...</thinking> tags. Then give the final answer.
The thinking block will be hidden from the end-user; the final answer
must stand alone.
```

## Example transformation
Original prompt: "should we ship this feature next week?"
After this technique:
- Wrapped with the thinking-tag instruction so the model lays out trade-offs before committing to a recommendation.

_TODO — flesh out with a real before/after pair from the eval corpus._
