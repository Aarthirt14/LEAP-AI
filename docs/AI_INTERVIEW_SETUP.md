# Optional OpenAI interview assistance

## What is implemented

An optional backend-only Responses API call using `gpt-6-luna`. It helps a person review clearer English wording of one saved answer, including supported language interpretation. It never writes a profile, verifies evidence, generates availability, or ranks pathways. The beneficiary must open the editor, save the correction, and confirm the current preview before facts are accepted. Raw transcripts remain unchanged. Unknown meanings should produce no suggestion; model accuracy is not established by unit tests.

Existing deployments remain compatible: the UI hides assistance when the capability endpoint is absent, disabled or unavailable. No schema migration, ranking change or new dependency is required.

## Staging activation only

1. Revoke the key previously pasted into chat. It was not used or copied into this project.
2. Set a newly generated key as `OPENAI_API_KEY` in the **leap-ui-v2-staging Render backend**, never a `NEXT_PUBLIC_*` variable or frontend setting. Do not paste it into chat or commit it.
3. Set `AI_INTERVIEW_ENABLED=true` and `OPENAI_INTERVIEW_MODEL=gpt-6-luna`. Confirm this model is available to the API project; unavailable models fail safely.
4. Deploy this branch to staging deliberately. Its current SQLite data is ephemeral: a Render redeploy can reset test journeys. Preserve required test records before deploying. No production main merge or production environment edit is authorized by this setup guide.
5. Use a synthetic interview first. Verify unchecked consent, a successful suggestion, manual correction and final confirmation. Test provider failure and an unsupported/ambiguous answer. Confirm unrelated interviews still work.
6. Rollback: set `AI_INTERVIEW_ENABLED=false`. Normal interview/profile/ranking flows need no API key.

## Data and reliability

- Per-answer explicit consent. Sends only the chosen answer text, its field key and interview language. It does not append identity, full profile or other answers. The answer itself may contain sensitive information; users should not include identifiers unnecessarily.
- `store:false` requests no Responses application-state storage; this is **not** a promise of zero provider retention. See the official data-controls documentation.
- No tools or arbitrary URLs; destination fixed to `https://api.openai.com/v1/responses`.
- Strict JSON schema plus server validation; refusals, incomplete output, invalid types, oversized output and provider failures return unavailable. No upstream exception details or raw provider bodies are logged by this service.
- Max input 2,000 characters, output 600 tokens, response 64 KiB. Connect timeout 3 seconds/read timeout 12 seconds, streaming elapsed guard 15 seconds checked between chunks; browser request timeout 20 seconds. These are bounded stages, not a guaranteed total server wall-clock deadline.
- No automatic retries. Two concurrent provider calls and six attempts/minute/user **per process**. This is not a distributed billing quota; configure project budgets and use a shared limiter before scaling to multiple workers.
- Secret is represented with `SecretStr`. Do not expose environment/config dumps in logs.
- Suggestions can still be factually wrong or prompt-injected despite schema validation. Human review is mandatory. Automated tests do not establish semantic accuracy.

## Verification status

85 backend tests passed (61 existing + 24 new), including no implicit persistence, stale preview rejection, access control, consent, provider 401/403/429/5xx, timeouts, refusal, malformed and oversized response handling, missing configuration and rate/concurrency limits. TypeScript and build passed. No live API call made; replacement credential and staging activation are required. Authenticated visual verification is still pending.

Official references used:
- https://developers.openai.com/api/docs/models/gpt-6-luna
- https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses
- https://developers.openai.com/api/docs/guides/your-data
