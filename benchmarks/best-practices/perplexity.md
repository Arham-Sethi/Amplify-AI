# Perplexity prompting best-practices (excerpt)

> Source: https://docs.perplexity.ai/guides/prompt-guide + the Sonar model card
> Last reviewed: 2026-05-08
> Models covered: Sonar, Sonar-Pro, Sonar-Reasoning, Sonar-Reasoning-Pro

## When to apply this layer

- `target == "perplexity"` — perplexity.ai chat box, the Sonar API, third-party hosts of Sonar models
- Sonar models are unique in that they're search-grounded by default — every response is generated from web-search results, not the model's parametric memory alone.

## Key directives the rewriter should bake in

- **Phrase prompts as queries, not commands.** "What are the trade-offs between Postgres row-level security and application-layer authz?" beats "Tell me the trade-offs between...". Sonar is tuned on search-query patterns and responds better to question-form prompts.
- **Ask for inline citations explicitly** when factuality matters. "Cite each claim with `[N]` markers referring to the source list at the end." Perplexity provides citations natively, but adding the explicit instruction improves citation density.
- **Include recency cues** when the information is time-sensitive. "As of November 2026" or "the most recent stable release" steer Sonar toward fresher search hits.
- **Specify domain restrictions** to reduce noise. "Only cite official documentation, .edu, or peer-reviewed sources" works well. "Exclude Reddit, Quora, and content-mill domains" also accepted.
- **For comparative questions, ask for a structured table.** Sonar is good at producing comparison tables when given the columns explicitly: "Compare X and Y across the dimensions: cost, latency, vendor lock-in. Return a markdown table."
- **For code or technical tasks, include the version explicitly.** "Using Next.js 15 (released Oct 2024)" — Sonar's search grounding can otherwise drag in stale stack-overflow advice.
- **State the audience and purpose** to bias toward right-sized answers. "Explain to a CTO evaluating this for a 10-engineer team" produces a different (better-targeted) answer than "explain it".

## Things to AVOID (that other targets prefer)

- **Don't ask for purely creative output** (poetry, fiction, novel metaphors). Sonar's search-grounding is a liability for creative tasks — it'll surface clichés from the web rather than generate fresh language. Use Claude or GPT for those.
- **Don't ask Sonar to "use only your training data"** — the search grounding isn't optional, and instructions to ignore it produce inconsistent results. If you want a non-grounded model, switch targets.
- **For Sonar-Reasoning models: don't add `<thinking>` or "step by step" instructions.** The reasoning trace is built in. Extra CoT instructions duplicate the effort and dilute the answer.
- **Don't assume the response is up-to-date about everything.** Sonar's search index has lag — anything younger than ~24 hours may not appear. For breaking news, say so explicitly: "If you can't find information from the last 7 days, say so rather than reporting older."
- **Don't request long-form outputs (>2000 words).** Sonar is optimised for "answer the query, cite sources, move on". Long-form content is better produced by Claude or GPT.

## Worked example

Original prompt (vague_instruction category):
> what's the best framework for this

Rewritten for Perplexity:
> What's the most-recommended Python web framework for building a REST API with the following constraints, as of late 2026?
>
> Constraints:
> - Single-developer project, ~10K daily requests
> - Async-first (real Python asyncio support, not just tacked on)
> - First-class type hints + automatic OpenAPI generation
> - Production-stable for at least 18 months
>
> Cite each framework you recommend with a `[N]` reference to its official docs or a recent (2025–2026) benchmark.
>
> Return a markdown table with columns: Framework | Reason it fits | Reason it might not | Citation.
>
> Exclude opinions from Reddit/HN threads. Prefer official docs, recent benchmarks, and peer-reviewed comparisons.
