# success-criteria-statement

## What it does
Forces the model to commit, before writing, to a one-sentence definition of "what would make this output successful." Reduces the dominant failure mode for vague prompts: the model picks a different success criterion than the user had in mind.

## When to apply
- Categories: `vague_instruction` (mandatory), `task_only` (when criteria are fuzzy), `context_heavy` (when "summarise" without specifying for whom)
- Intents: `decision_recommendation_from_data`, `creative_generation`, `editorial_critique`
- Targets: all

## When NOT to apply
- The user explicitly stated success criteria.
- Trivial prompts where the criterion is obvious ("translate this to French").

## Snippet to inject (template)
```
Before responding, state in ONE sentence what would make this response a success.
Example: "A successful response is concise (≤200 words), uses no jargon, and ends with one clear recommendation."
Then produce the response that meets that definition.
```

## Example transformation
_TODO — fill from eval corpus._
