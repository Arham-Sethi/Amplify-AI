# Waitlist update emails

Cadence: **every 2 days**, manual send. No cron yet — we want eyes on each broadcast and a chance to read the actual rendered email in our own inbox before it hits 60 people.

## The 4-email sequence

| Day | Script | Subject | Theme |
|-----|--------|---------|-------|
| 1 | `send-update-01-foundations.js` | `Quick update on Amplify` | The 6 prompt categories, why we're not building "one fits all" |
| 3 | `send-update-02-rubric.js` | `How we decide if a prompt is good` | The rubric, KS_Probe heritage, ask for vague-category input |
| 5 | `send-update-03-outline.js` | `Why Amplify won't underline your prompt` | Outline-not-underline, 3 intensity modes, ask for bad-prompt examples |
| 7 | `send-update-04-extension.js` | `What's next for Amplify` | Extension MVP, beta access, confirm account email |

After day 7, write update #5 (copy `send-update-04-extension.js`, change content + subject + campaignName) and keep the cadence going.

## How to send each one

Run from the repo root, in the order above, with at least 2 days between sends.

```bash
# 1. Preview the recipient list — sends nothing.
node scripts/send-update-01-foundations.js --dry-run

# 2. Send a test to yourself first. Open it in the inbox where YOU
#    actually read mail (Gmail, Apple Mail, Outlook…) and confirm:
#    - It landed in Primary, not Promotions
#    - The "Hi {first_name}," renders correctly
#    - The "P.S. #{position}" shows your real position
#    - Reply-To opens to contact@kangaroo.solutions
node scripts/send-update-01-foundations.js --only=devhemnani777@gmail.com

# 3. Real send — only after the test looks right.
node scripts/send-update-01-foundations.js
```

If a few sends fail mid-broadcast, the script logs `FAIL #N email reason`. Re-run with `--only=that-email@x.com` to retry just those. Resend's dashboard logs every attempt for debugging.

## Required env vars

Must be in `.env.local` or your shell at send time:

- `RESEND_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional overrides:

- `CAMPAIGN_FROM_EMAIL` — default `Dev from Amplify AI <hello@amplifyai.cc>`
- `FROM_EMAIL` — fallback if the above isn't set; shared with `lib/email.js`
- `REPLY_TO_EMAIL` — default `contact@kangaroo.solutions`

## Inbox-not-Promotions checklist (already baked into `lib/campaign.js`)

These are the rules that bias Gmail toward Primary instead of Promotions. All of them are enforced or recommended by Google's own bulk-sender guidance (Feb 2024).

- ✅ **Personal-name From** — `Dev from Amplify AI <hello@amplifyai.cc>`, not `Amplify AI Team` or `noreply@`. Reads as a person.
- ✅ **Reply-To routes to a human** — `contact@kangaroo.solutions`. People can actually reply and we'll see it.
- ✅ **Matching plain-text and HTML** — Gmail downranks emails where the two diverge. Each script renders both.
- ✅ **No images, no buttons, no tables** — image-heavy emails go to Promotions. We use `<p>` and `<ul>` only.
- ✅ **No inline brand colors / gradients** — same reason.
- ✅ **`List-Unsubscribe` + `List-Unsubscribe-Post` headers** — both required by Gmail/Yahoo bulk-sender rules.
- ✅ **600ms between sends** — under Resend's 10 req/s rate limit, also avoids triggering ESP burst-detection.
- ✅ **Subject lines are conversational** — lowercase, under 50 chars, no `!`, no `[BRACKETS]`, no emoji. They read like you'd write them in a 1:1 email.
- ✅ **Sender domain has SPF/DKIM/DMARC** — already configured on `amplifyai.cc` from earlier setup. Don't change it.

## Writing a new update (#5+)

Each broadcast should:

1. Open with **the specific thing**, no preamble. ("Quick update on…", "Most prompt tools…", "Headline: …")
2. Share **one real, specific decision or piece of work** — something the reader didn't know yesterday.
3. Have **one feedback ask** — Discord, email, or reply. Never all three with equal weight, pick a primary.
4. Sign as `— Dev / Amplify AI` (matches the Discord invite and stays consistent).
5. End with `P.S. #${position}` — gives every recipient a personal anchor and signals "we know you specifically."

Length target: 200–300 words. Long enough to be substantive, short enough to read in under a minute on a phone.

Avoid:

- Marketing words: "exciting", "amazing", "revolutionary", "game-changing"
- Multiple CTAs in one email
- Anything that smells like a press release
- Vague claims ("we've been working hard") — be specific or don't say it

## Cadence notes

- **Every 2 days is intentional.** Close enough that people remember Amplify, far enough that they don't unsubscribe. If you skip a day, that's fine — better than sending something half-baked.
- **Don't send the same script twice.** Resend dedupes by message body for spam scoring; running the same broadcast twice would tank deliverability for the whole sender domain.
- **Watch for unsubscribes.** If the rate climbs above ~5% on any single send, pause the cadence and review the copy before continuing.

## When you're ready to ship the extension

After `send-update-04-extension.js` lands and the extension is in the Chrome Web Store, write a launch broadcast (`send-launch-01-extension-live.js`) using this same pattern. The "60-person waitlist goes first" promise from update #4 makes that email basically write itself.
