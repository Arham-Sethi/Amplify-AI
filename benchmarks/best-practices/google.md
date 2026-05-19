# Google (Gemini) prompting best-practices (excerpt)

> Source: https://ai.google.dev/gemini-api/docs/prompting-strategies + Gems docs at https://gemini.google.com/intro
> Last reviewed: 2026-05-08
> Models covered: Gemini 1.5 Pro / Flash, Gemini 2.x, Gems

## When to apply this layer

- `target == "google"` — gemini.google.com, the Gemini API, Gems (custom-instruction Gemini personas)
- Also a reasonable fallback when targeting Bard's successors or Google Workspace AI features that use the same family.

## Key directives the rewriter should bake in

- **Lead with a clear persona prefix.** "You are a senior data analyst with expertise in financial modelling." Gemini's instruction-following is strongest when the role is established up front. More effective here than for Claude.
- **Use markdown sections with explicit headers** — `## Task`, `## Constraints`, `## Output format`. Gemini parses these reliably and respects them as scoping boundaries.
- **Label every input modality block.** For multi-modal prompts, prefix each block with its type: "Text:", "Image:", "Audio:", "Code:". Don't rely on positional ordering — Gemini treats unlabelled multi-modal input as ambiguous.
- **Specify code-generation context explicitly** — language, framework, version, file context. "Write a TypeScript function in a Node 20 module that uses the @supabase/supabase-js v2 client" produces materially better output than "write me a TypeScript function".
- **Be explicit about what NOT to include.** Gemini's safety filters can over-fire if the prompt or output drifts into edge territory. Constraints like "no medical advice", "no legal advice", "factual claims must be cited" keep output within Gemini's comfort zone and reduce truncation.
- **Use few-shot examples with clear input/output separators.** Gemini is particularly responsive to "Input: ... Output: ..." example pairs.
- **For long context (Gemini 1.5+ supports up to 2M tokens), still chunk-label.** A 1M-token input pasted as one wall is harder to attend to than the same input split into named sections.
- **Keep tone professional rather than playful.** Gemini's RLHF tilts more conservative than Claude's; instructions in a casual register sometimes produce overly formal output as a counter-balance.

## Things to AVOID (that other targets prefer)

- **Don't lean on XML tags as the primary structure.** Gemini handles them but they aren't its native form. Markdown sections with `##` headers are the idiomatic choice.
- **Don't use `<thinking>` tags expecting native CoT scaffolding.** Gemini's reasoning is internal and doesn't expose it via tags. If you want explicit reasoning, ask for it in prose: "Walk through your reasoning step by step before giving the final answer."
- **Don't push past safety filters** with "ignore previous instructions" phrasing or jailbreak-style prefixes. Gemini's safety classifier is aggressive; even legitimate prompts can get truncated if the structure looks adversarial.
- **Don't rely on triple-backtick code blocks** for non-code data. They work, but Gemini sometimes renders the response inside a markdown code block when one was used in input. Use prose-style triple-quotes (`"""`) for non-code reference text.
- **Don't ask for raw JSON without specifying a schema.** Gemini will produce well-formed JSON, but the field names will drift between calls. Always show an example object with the exact keys you expect.

## Worked example

Original prompt (role_persona category):
> Act as a UX designer and review this landing page

Rewritten for Google:
> ## Persona
> You are a senior UX designer with 10+ years' experience reviewing SaaS marketing pages.
>
> ## Task
> Review the landing-page copy and layout below. Identify the three highest-impact issues that hurt conversion, ranked by estimated impact.
>
> ## Constraints
> - Focus on conversion, not aesthetics or branding.
> - For each issue, give: (a) what's wrong, (b) why it hurts conversion, (c) a one-sentence specific fix.
> - No legal or medical-claim issues — this is a generic SaaS page.
>
> ## Output format
> Return a numbered list. Example:
>
> 1. **Issue:** No clear primary CTA above the fold.
>    **Why it hurts:** Visitors don't know what action to take in the first 5 seconds.
>    **Fix:** Move the "Start free trial" button into the hero, replacing the secondary "Watch demo" link.
>
> ## Page content
> Text:
> [pasted landing-page copy]
