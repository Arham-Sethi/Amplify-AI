# role-injection

## What it does
Prefixes the prompt with a specific persona ("You are a senior staff engineer...") to shift register, vocabulary, and judgement criteria.

## When to apply
- Categories: `role_persona` (mandatory), `task_only` (when the user named a domain), `debug_fix` (a "senior X" framing improves diagnostic depth)
- Intents: `expert_review`, `domain_critique`, `professional_writing`
- Targets: all

## When NOT to apply
- User explicitly asked for a neutral / persona-less answer.
- Generic creative writing where a named persona narrows variety.

## Snippet to inject (template)
```
You are {role}, with {expertise}. Your job is to {task verb} the input
the way a {role} would — using the standards and vocabulary of that field.
```

## Example transformation
_TODO — fill from eval corpus._
