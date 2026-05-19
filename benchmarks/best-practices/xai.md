# xAI (Grok) prompting best-practices (excerpt)

> Source: https://docs.x.ai/docs/overview + observed behaviour across Grok 2 / Grok 3 / Grok 4 + xAI's published model cards
> Last reviewed: 2026-05-08
> Models covered: Grok 2, Grok 3, Grok 4 (with explicit Think mode)

## When to apply this layer

- `target == "xai"` — grok.x.ai, the xAI API, the Grok integration inside X (formerly Twitter)
- Grok's strongest differentiator is real-time access to the X firehose, so prompts that benefit from "what is the world saying right now" should be routed here.

## Key directives the rewriter should bake in

- **Use markdown structure with explicit `##` section headers** — Grok's instruction-following is closest to GPT-4-class behaviour, and the same conventions apply.
- **Lead with a clear task statement, then provide context.** Grok performs best when the task is unambiguous in the first sentence; long preambles before the actual ask produce wandering responses.
- **For real-time / current-events questions, say so explicitly.** "Based on what's being discussed on X over the last 24 hours" steers Grok toward its X-grounded mode rather than parametric memory.
- **Specify the audience.** Grok's default tone is more casual than Claude or Gemini; an explicit audience cue ("for a quarterly board update", "for a Slack message to engineering") tunes the register correctly.
- **For code generation, include the language and framework version** as fenced code blocks: ` ```typescript:next-15 `. Grok respects these scoping hints.
- **Use Think mode for hard reasoning tasks** (Grok 4+). When complexity warrants it, prefix with "Use thinking mode" — Grok will surface a reasoning trace before the final answer. Don't combine with `<thinking>` tags or "step by step" — the mode handles it.
- **For X-grounded queries, ask for source post links.** "Link to the top 3 posts you're drawing from." Grok will return X URLs inline.

## Things to AVOID (that other targets prefer)

- **Don't lean heavily on XML tags.** Grok handles them but markdown is its native idiom — stick with `##` headers + bullet lists.
- **For Grok 4 with Think mode: don't add `<thinking>` tags or "let's think step by step".** The mode is built in; manual CoT instructions interfere with the internal reasoning trace.
- **Don't ask Grok to "ignore real-time context"** — its X grounding is one of the reasons to pick it over GPT or Claude. If you want a non-grounded answer, switch targets.
- **Don't expect Anthropic-style "I don't know" hedging** by default. Grok will commit to an answer even on shaky ground unless explicitly told to flag uncertainty: "If you're not at least 80% confident, say so explicitly rather than guessing."
- **Don't use overly formal academic register.** Grok's RLHF tilts conversational; deeply formal prompts can produce strangely stiff responses. Match the register to the actual audience (which usually isn't academic).
- **Don't stack many constraints in one prompt.** Grok handles 3–5 constraints cleanly but degrades past that — break complex requests into sequential turns rather than one mega-prompt.

## Worked example

Original prompt (task_only category):
> summarize what people are saying about [topic]

Rewritten for xAI:
> ## Task
> Summarise the dominant viewpoints on [topic] from posts on X over the last 48 hours.
>
> ## What I want
> 1. The 2–3 most common positions, with a one-sentence summary of each.
> 2. Approximate volume signal (e.g., "many posts", "a few high-engagement posts", "trending"). Don't fabricate exact counts.
> 3. The single most-engaged post for each position, linked.
>
> ## Constraints
> - Surface disagreements rather than averaging them away.
> - If a position is held mostly by a coordinated set of accounts, note that.
> - Exclude verified-bot accounts.
>
> ## Audience
> An exec briefing, so concise and structured. Total length under 300 words.
