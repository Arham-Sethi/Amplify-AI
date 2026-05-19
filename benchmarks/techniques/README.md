# Technique suite (rewrite layer L5)

> **Source of truth for the layer:** [`CLAUDE.md` §7.5](../../CLAUDE.md#75-rewrite-composition-layers).
> **Mapping matrix:** [`../technique-mapping.json`](../technique-mapping.json).

Each file in this directory documents **one technique** the rewriter can inject into a system prompt. Techniques are vendor-neutral building blocks — what *changes* per request is which subset of techniques get pulled, based on the (category × intent × target) tuple in `technique-mapping.json`.

## Catalogue

| File | When it helps |
|---|---|
| `chain-of-thought.md` | When the task requires multi-step reasoning the model should externalise. Skip on reasoning-native models (o-series, R1). |
| `few-shot.md` | When format consistency matters more than novelty (e.g., classification, extraction). |
| `xml-tag-scaffolding.md` | When the prompt has multiple distinct pieces (context + task + examples). Especially effective on Claude. |
| `role-injection.md` | When a persona meaningfully changes register (legal review, code review, copy editing). |
| `explicit-format-block.md` | When the user expects structured output (JSON, table, bullet list). |
| `explicit-constraint-listing.md` | When the prompt has implicit constraints ("not too long", "make it polite") that need to be made testable. |
| `output-schema-priming.md` | When the consumer downstream is a parser, not a human. |
| `success-criteria-statement.md` | When the user's notion of "good" is fuzzy. Forces the model to commit to a definition before writing. |

## File format

```markdown
# <Technique name>

## What it does
1-2 sentences.

## When to apply
- Categories: [list]
- Intents: [list]
- Targets: [list — or "all"]

## When NOT to apply
- ...

## Snippet to inject (template)
```
<text the rewriter literally inlines into the system prompt, with placeholders>
```

## Example transformation
Original prompt → ...
After this technique → ...
```

## How the rewriter consumes this

At rewrite time, the backend:

1. Looks up `(category, intent, target)` in `technique-mapping.json`
2. Gets back a list of technique IDs (e.g., `["chain-of-thought", "explicit-format-block"]`)
3. Reads each technique file and extracts the "Snippet to inject" block
4. Composes them into a single `<techniques>` section of the system prompt

Sonnet sees the snippets, not the rest of the file. The "When to apply / NOT to apply" sections are documentation for humans editing the matrix, not runtime input.

## Adding a new technique

1. Write the file with all 5 sections.
2. Add an entry to `../technique-mapping.json` mapping at least one (category × intent × target) to it.
3. Add a row to the table above.
4. If the technique only applies on certain targets, also note it in the relevant `best-practices/<target>.md`.
