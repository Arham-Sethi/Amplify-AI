# Best-practices excerpts (rewrite layer L4)

> **Source of truth for the layer:** [`CLAUDE.md` §7.5](../../CLAUDE.md#75-rewrite-composition-layers).

Each file in this directory is a **distilled excerpt** from the target LLM's official prompting guide, scoped to what a rewriter actually needs. Not a full mirror of the upstream doc — just the parts that change *how we should rewrite* a user's prompt for that target.

## Files

One file per `target` value the classifier accepts:

- `openai.md` — GPT-4 / GPT-5 / o-series
- `anthropic.md` — Claude (3.x, 4.x)
- `google.md` — Gemini (1.5, 2.x)
- `deepseek.md` — DeepSeek-V2 / V3 / R1
- `perplexity.md` — Perplexity (Sonar models)
- `xai.md` — Grok

## What goes in each file

```markdown
# <Target> prompting best-practices (excerpt)

> Source: <link to vendor's official doc>
> Last reviewed: <YYYY-MM-DD>
> Models covered: <list>

## When to apply this layer
- target == "<target>" in the rewrite request, OR
- the prompt is being rewritten for any model whose tokenizer/RLHF profile this target dominates

## Key directives the rewriter should bake in
- ...

## Things to AVOID (that other targets prefer)
- ...

## Worked example
Original: ...
Rewritten (this target): ...
```

## How the rewriter consumes this

At rewrite time, [`apps/backend/api/rewrite.js`](../../apps/backend/api/rewrite.js) reads `<target>.md`, extracts the "Key directives" + "Things to AVOID" sections, and inlines them into the system prompt as a `<target_best_practices>` block. The full file isn't shipped to Sonnet — only the actionable bullets.

## Update cadence

Vendor docs change. Each file carries `Last reviewed:` at the top. Anything older than **90 days** is flagged as stale by `scripts/check-best-practices-freshness.js` (Phase 1 deliverable). Refresh by re-reading the upstream guide and regenerating the bullets.

## Why the file is curated, not auto-fetched

- Vendors ship long, marketing-heavy guides. We need 200 tokens of signal, not 5,000 tokens of preamble.
- An auto-fetch loop would silently break the rewriter the moment a vendor restructured their docs site.
- Curated excerpts are auditable: anyone can read the diff and ask "why did we tell users to switch from JSON to XML?"
