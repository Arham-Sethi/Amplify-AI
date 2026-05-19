# OpenAI prompting best-practices (excerpt)

> Source: https://platform.openai.com/docs/guides/prompt-engineering + the o-series reasoning guide at https://platform.openai.com/docs/guides/reasoning
> Last reviewed: 2026-05-08
> Models covered: GPT-4o, GPT-4 Turbo, GPT-5 (when released), o1 / o3 / o4-mini reasoning series

## When to apply this layer

- `target == "openai"` — chatgpt.com, ChatGPT.app, custom GPTs, API consumers, Microsoft Copilot (rides on the same family)
- Note: the directives below are tuned for GPT-4-class chat models. For o-series reasoning models, the "Things to AVOID" section calls out the differences.

## Key directives the rewriter should bake in

- **Put instructions at the top of the prompt, then data underneath.** OpenAI's models pay disproportionate attention to the first few hundred tokens. Lead with the task, follow with context.
- **Wrap reference data in triple-quoted blocks** (`"""..."""`) or fenced code blocks. The model recognises these as separators between "what I'm asking" and "what I'm asking about".
- **Be specific about the output structure.** "Return JSON with keys `summary`, `confidence`, `next_steps`" beats "return JSON". For dictated output, say so: "respond in markdown with a `## Findings` section".
- **Use numbered or bulleted lists** for multi-part instructions. The model treats each item as a discrete sub-task to satisfy.
- **For structured output, prefer JSON mode** (`response_format: { type: "json_object" }`) over asking nicely. The mode constrains generation deterministically; ad-hoc "return only JSON" prompts still produce stray prose.
- **Include 2–3 few-shot examples** when format consistency matters more than novelty (extraction, classification, transformation tasks).
- **Specify the audience.** "Explain to a senior engineer" produces different output than "explain to a non-technical exec" — and OpenAI's models are particularly responsive to audience cues.
- **State constraints as explicit "must" / "must not" rules**, not negations buried in prose. "Must be ≤ 150 words" beats "don't be too long".

## Things to AVOID (that other targets prefer)

- **Don't lean heavily on XML tags** like `<context>` and `<task>`. They work, but markdown sections + triple-quotes are more idiomatic for OpenAI and produce slightly cleaner output. (Anthropic's Claude is the opposite.)
- **For o-series (o1, o3, o4-mini): do NOT instruct chain-of-thought.** These are reasoning models that do step-by-step internally. Adding "think step by step" wastes tokens and can degrade quality by interfering with the internal reasoning loop.
- **For o-series: avoid overly elaborate prompts.** They're designed to expand simple requests into rich answers; verbose multi-section prompts dilute the signal. Keep it under ~300 tokens of instructions.
- **Don't use system messages for casual tone-setting.** OpenAI's instruction-following is strict — a system message saying "be friendly" applies aggressively. Better to specify register in the user message.
- **Don't ask for low-confidence answers without a fallback.** Without explicit instruction, GPT will confabulate when uncertain. Add: "If the answer isn't clearly supported by the context, say so."

## Worked example

Original prompt (vague_instruction category):
> make this email better

Rewritten for OpenAI:
> Rewrite the email below to be more professional. Constraints:
> - Keep it under 120 words
> - Open with a clear subject-line summary in the first sentence
> - Use bullet points for any multi-step asks
> - End with a single, specific next step
>
> If a constraint conflicts with the email's intent, prefer the intent and note the conflict at the bottom.
>
> """
> [original email here]
> """
