# Qualification eligibility release

## Behavior

`ProfileData.eligibility_facts` stores nullable facts keyed by `NQR:<registry_id>`. The nested schema rejects unsupported fields (including beneficiary-controlled verification), invalid registry keys, negative/non-finite years and unsupported certificates. Zero and empty certificate lists are distinct from null. Profile updates retain access checks and require consent to add eligibility facts. Clearing remains possible after consent withdrawal. Interview extraction preserves these supplementary facts.

Ranking supplies each qualification only its own facts plus profile education. Generic skill experience is never substituted for qualification-relevant experience. NTC_2_YEAR implies NTC, but not the reverse. Missing NOS mappings still require human review.

## Release procedure

1. Back up production and verify restoration access. Test migrations and concurrent interview retries on a separate PostgreSQL database first. The automated suite uses SQLite and does not validate PostgreSQL row locking.
2. Deploy the backend revision and run `alembic upgrade head`, including `20261007_nqr_metadata` and `20261007_eligibility_facts`.
3. Docker startup runs migrations and imports `seed/data/nqr-reference.json` idempotently before serving traffic. CI checks this bundled file equals `data/nqr-reference.json`. To validate a reviewed snapshot manually from `backend`: `python -m seed.load_nqr_database ../data/nqr-reference.json`. The default is a dry run. A backend-only deployment must make the exact versioned source file available explicitly.
4. Apply with `python -m seed.load_nqr_database ../data/nqr-reference.json --apply`, then repeat the dry run to confirm two unchanged records. Do not seed synthetic users or opportunities in production.
5. Deploy the frontend to the existing Vercel project/domain. Verify an authorized user can save, reload and clear entry-route facts, and that recalculation produces source-linked eligibility evidence. Use approved test accounts; never expose beneficiary details in screenshots.
6. Confirm local batches, seats and fees remain unverified. Source review expires after 30 days; update only after checking the official record again.

## Verification status

Production frontend build and TypeScript checks pass. Backend tests cover persistence, ownership, consent, invalid facts, null versus zero, route alternatives and cross-qualification isolation. Both migrations add reversible nullable JSON columns. SQLite upgrade/import/repeat/downgrade is checked locally. PostgreSQL 18 checks passed in [GitHub Actions](https://github.com/Aarthirt14/LEAP-AI/actions/runs/37594052401): concurrent starts and identical answer retries deduplicated, JSON profile persistence, idempotent import, migration downgrade/re-upgrade.

Production commit `0816a4690304059ee15919a2678b483f9f0de9b4` deployed successfully to Render and Vercel on 7 October 2026. Render logs confirm both migrations and `{created: 2, updated: 0, unchanged: 0, apply: true}`. `/health` reports healthy, database connected, production; `/openapi.json` contains the eligibility profile schema. The existing Vercel domain serves the catalogue and entry-route profile controls. A browser check confirmed changing demo fields cannot save to production. Authenticated profile persistence was tested in CI, not with a real beneficiary on production. Real-device speech testing remains outstanding.

For rollback, first restore the prior application release. Preserve a database backup before downgrading: downgrade drops the newly collected supplementary facts and source metadata. Do not downgrade while the new application code is serving requests.
