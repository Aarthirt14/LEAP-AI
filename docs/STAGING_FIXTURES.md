# Disposable staging fixtures

This CLI exists only for the UI verification environment, not as an application endpoint. It changes no production startup command or ranking code.

Target: Render `srv-daudbng93c1s73dq4b20` (`leap-ui-v2-staging`), branch `redesign/leap-ui-v2`, database `sqlite:///./leap_ui_v2_staging.db`. All three values plus explicit activation must match. It refuses to replace an existing account with different credentials or privileges. No admin is created.

Configure only on that service:

| Variable | Value |
|---|---|
| LEAP_STAGING_FIXTURES | enabled |
| STAGING_WORKER_PASSWORD | Independently generated, 32+ characters |
| STAGING_FACILITATOR_PASSWORD | Independently generated, 32+ characters |
| STAGING_OFFICER_PASSWORD | Independently generated, 32+ characters |

Passwords must differ. Use Render's Generate buttons and keep values private for secure browser sign-in. The script hashes passwords and never logs them. `DEMO_MODE` remains false.

Accounts: `worker.staging@example.com`, `facilitator.staging@example.com`, `officer.staging@example.com`.

Staging-only Docker Command:

```sh
sh -c 'alembic upgrade head && if [ "$LEAP_STAGING_FIXTURES" = enabled ]; then python -m seed.staging_fixtures; fi && uvicorn app.main:app --host 0.0.0.0 --port 8000'
```

Build the latest redesign branch when activating. This can reset the ephemeral SQLite database, so the earlier disposable beneficiary account may need recreating. Repeated bootstrap with the same credentials is idempotent. It does not create consent, beneficiary records, selected pathways, reviews, or outcomes.

Four qualifications and synthetic opportunities are labelled TEST ONLY and preserve SYNTHETIC provenance. One qualification has an expired date despite its VALID enum, to exercise exclusion. Synthetic seats and distances must never appear as verified availability. Do not import these fixtures into production.

Validation: full backend suite 60 passed (including seven bootstrap safety/idempotency cases); TypeScript and production build passed. Cloud activation and staff browser checks remain pending credential entry.

Changed files: `backend/seed/staging_fixtures.py`, `backend/tests/test_staging_fixtures.py`, this document. Run `python -m pytest -q` from backend for the regression gate.
