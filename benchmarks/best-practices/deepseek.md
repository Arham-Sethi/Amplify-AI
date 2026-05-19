# DeepSeek prompting best-practices (excerpt)

> Source: https://api-docs.deepseek.com/ + the DeepSeek-R1 paper (https://arxiv.org/abs/2501.12948) + observed behaviour
> Last reviewed: 2026-05-08
> Models covered: DeepSeek-V2.5, DeepSeek-V3, DeepSeek-R1 (reasoning model), DeepSeek-Coder-V2

## When to apply this layer

- `target == "deepseek"` — chat.deepseek.com, the DeepSeek API, third-party hosts of DeepSeek models
- Note: DeepSeek-R1 is a reasoning model with a fundamentally different prompting profile than V2.5/V3 chat models. The directives below cover both; the "Things to AVOID" section calls out R1-specific items.

## Key directives the rewriter should bake in

- **Use markdown structure with `##` headers and bulleted lists.** DeepSeek's instruction-following is closest to GPT-4-class behaviour for V3 and Claude-class for R1. Markdown works well for both.
- **For DeepSeek-Coder, lead with the language + version.** "Write a Python 3.11 function that uses asyncio" beats "write a Python function". DeepSeek-Coder is precise about syntax features tied to specific versions.
- **For multi-step technical tasks, decompose explicitly.** DeepSeek follows numbered procedures faithfully — "1. Parse the input. 2. Validate against schema. 3. Return the normalised form." produces consistently-structured output.
- **State output format in JSON-schema style** for structured data tasks. DeepSeek-V3 supports a `response_format` parameter; for the chat surface, an example object with annotated comments works well.
- **For DeepSeek-R1: ask the question, then stop.** Don't decorate with reasoning hints. R1's training is oriented toward producing its own reasoning trace; extra scaffolding interferes.
- **Be specific about what counts as "done".** DeepSeek tends to over-explore on under-specified tasks. "Stop after providing the requested output; don't suggest follow-up improvements unless asked." prevents trail-off.
- **For code review tasks, name the review dimensions explicitly.** "Review for: (1) correctness, (2) error handling, (3) performance hotspots, (4) test coverage." Without this, DeepSeek-Coder defaults to style-only review.
- **For non-English prompts, repeat the language preference.** DeepSeek is bilingual (Chinese-English) by default and may switch mid-response if the input is ambiguous. "Respond in English" or "Respond in Chinese" at both top and bottom of the prompt locks it in.

## Things to AVOID (that other targets prefer)

- **For DeepSeek-R1: do NOT add chain-of-thought instructions.** R1 is a reasoning model with native CoT. "Think step by step" or `<thinking>` tags actively degrade performance — they duplicate work R1 already does internally.
- **For DeepSeek-R1: do NOT add few-shot examples for reasoning tasks.** R1's training discourages mimicry; examples can collapse the diversity of its reasoning traces. Few-shot still works for *format* (input/output shape) but not for *reasoning style*.
- **Don't lean heavily on XML tags.** They work but markdown is more idiomatic for DeepSeek. Reserve XML for cases where you genuinely need nested structure that markdown can't express.
- **Don't ask for verbose answers without an explicit length cap.** DeepSeek-V3 will produce 2000-word responses to 100-word questions. Always cap: "≤ 300 words" or "≤ 5 bullets".
- **Don't expect DeepSeek to refuse politely on uncertain topics.** Its safety filtering is lighter than Claude's or Gemini's. If the answer matters and uncertainty is dangerous, add: "If you're not at least 80% confident, say so explicitly rather than producing a guess."
- **Don't use system messages for personality cues** — DeepSeek's system-prompt handling is narrower than GPT's. Put persona + tone instructions at the top of the user message instead.

## Worked example

Original prompt (debug_fix category):
> why is my code throwing an error

Rewritten for DeepSeek-Coder:
> ## Task
> Diagnose the root cause of the error below. Don't just describe what the
> error message means — identify which line of code triggers it and why,
> then propose the minimal fix.
>
> ## Stack
> - Language: Python 3.11
> - Framework: FastAPI 0.110
> - DB driver: asyncpg 0.29
>
> ## Code
> ```python
> [pasted code]
> ```
>
> ## Error
> ```
> [pasted stack trace]
> ```
>
> ## Output format
> 1. **Root cause:** one sentence.
> 2. **Why this code triggers it:** 2–3 sentences.
> 3. **Minimal fix:** the smallest code change. Show the diff.
> 4. **Test:** a 5-line snippet that proves the fix.
>
> Stop after the test snippet. Don't suggest broader refactors or
> architectural improvements unless I ask.
