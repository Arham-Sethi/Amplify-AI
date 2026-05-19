# Anthropic prompting best-practices (excerpt)

> Source: https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview + the Claude 4 model card
> Last reviewed: 2026-05-08
> Models covered: Claude 3.5 Haiku / Sonnet, Claude 3 Opus, Claude 4.x family, Claude 4.5 / 4.6 Sonnet (current Amplify rewriter)

## When to apply this layer

- `target == "anthropic"` — claude.ai, Claude.app, Cursor's Claude provider, the Anthropic API. This is also Amplify's own rewriter target; the L4 layer below the rewriter is `target == "anthropic"`.

## Key directives the rewriter should bake in

- **Use XML tags to delimit sections.** `<context>`, `<instructions>`, `<example>`, `<criteria>`. Claude is RLHF-trained on this convention and pays measurable attention to tag structure. Mixed prose-and-XML beats either alone.
- **Place context BEFORE the task, not after.** Opposite of OpenAI's general advice. Claude reads top-down and applies the task to whatever context preceded it. Trailing context can be ignored on long prompts.
- **Use multi-shot examples liberally.** Claude's long-context strength means 5–10 examples are typically better than 2–3. Wrap each in `<example>` tags with explicit input/output sections.
- **Encourage explicit reasoning via `<thinking>` tags** when accuracy matters. "Use `<thinking>...</thinking>` blocks to work through your reasoning before producing the final answer." The thinking content is hidden from end-users but improves answer quality on multi-step problems.
- **Be direct, not flattering.** Claude's instruction-following is sharper when prompts are unambiguous. "Critique the argument below for logical fallacies" beats "I'd really appreciate if you could perhaps look at the argument...". No "you are an expert" preamble needed — Claude follows direct instructions.
- **State success criteria explicitly.** "A successful response: (a) cites every claim, (b) acknowledges uncertainty, (c) is ≤ 200 words." Claude calibrates well to enumerated criteria.
- **For structured output, use XML or JSON inside fenced code blocks.** Specify the schema with annotated example: `<output_schema>` with field names + type comments works as well as JSON.
- **Use `<thinking>` for chain-of-thought, not "let's think step by step".** The latter works but Claude has been specifically tuned to use the tag form, which produces cleaner separation between reasoning and final answer.
- **For long context (>50K tokens), put the question at the end** AND repeat critical instructions briefly at both top and bottom. Claude's "lost in the middle" problem is real but smaller than GPT's.

## Things to AVOID (that other targets prefer)

- **Don't rely on JSON mode-style structure as the primary scaffolding.** Claude doesn't have a JSON mode. Use XML for structure; if JSON output is required, ask explicitly with a schema example.
- **Don't truncate examples to save tokens.** Claude's long-context strengths reward verbose few-shot — short, terse examples leave the model under-anchored.
- **Don't use OpenAI-style triple-quoted blocks (`"""..."""`)** as the primary input separator. They work but XML tags carry stronger signal. Reserve triple-quotes for short literal text.
- **Don't add "be helpful" / "be polite" / "be friendly" instructions** — they're Claude's default behaviour and overriding them just wastes tokens. If you want a different register, specify it directly: "Adopt a curt, technical register."
- **Don't ask Claude to be confident about uncertain answers.** Claude will hedge naturally, and overriding that ("be definitive") produces overconfident output. Better: "If unsure, say so and explain why."
- **Don't stack a long system prompt with a long user prompt.** Claude treats both as one continuous context. Keep system prompts focused on persona + format; put dynamic content in the user message.

## Worked example

Original prompt (context_heavy category):
> here are my Q3 sales numbers [pasted CSV]. what should I do?

Rewritten for Anthropic:
> <context>
> Below is a Q3 sales CSV with 47 product SKUs across 4 regions. Columns:
> sku, region, units_q2, units_q3, revenue_q2, revenue_q3, margin_pct.
>
> [pasted CSV]
> </context>
>
> <task>
> Identify the 3 highest-leverage actions to improve Q4 revenue based on the
> Q3-vs-Q2 deltas above. Prioritise actions that are reversible within Q4
> (e.g., pricing tweaks, marketing reallocation) over structural changes
> (new product, new region) that take longer.
> </task>
>
> <thinking>
> Use this block to identify the SKUs and regions where the Q2→Q3 deltas are
> most signal-rich, then evaluate what action each pattern suggests, then
> rank by reversibility × estimated impact.
> </thinking>
>
> <criteria>
> A successful response:
> - Names the SKU(s) or region(s) for each action specifically.
> - Quantifies expected Q4 impact (rough range is fine, exact is suspicious).
> - Calls out any data quality concerns the CSV reveals.
> - Stays under 250 words excluding the thinking block.
> </criteria>
