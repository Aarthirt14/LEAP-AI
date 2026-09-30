# Milestone 1.5 — targeted credibility fixes

The architecture, database schema and ranking weights remain unchanged. No migration or production settings change was made.

- Explicitly clearing a corrected answer no longer restores the original transcript or silently retains an older profile value. PATCH clearing retains omitted fields. Regression tests cover these semantics.
- Pathway descriptions now follow calculated fit rather than asserting a tailoring background or solar interest from a qualification title. Unsupported multilingual current occupations also trigger review when no skill row exists.
- Added server extraction preview and explicit confirmation token. Editing invalidates the preview. Completion is idempotent and rechecks consent. Transcripts are preserved; extracted facts remain unverified self-reports.
- Discard client speech/extraction confidence; beneficiaries cannot self-verify skills or outcomes. Only staff can record field-verified outcomes. Ranking history uses verified outcome provenance only.
- Enforce qualification date windows (inclusive UTC boundaries) and exclude malformed dates. Missing dates remain uncertain.
- Exclude synthetic/unverified training from availability and distance calculations. Preserve provenance and show uncertainty in evidence.
- Expose pending human review and review state; block beneficiary progression reports for unapproved RED pathways. Approval does not automatically select a livelihood for the beneficiary.
- Preserve Unicode text. Explicit Tamil/Hindi aliases cover a limited occupation set. Unsupported non-Latin occupation mapping triggers review; numeric words/ranges are not guessed.
- Replace static dashboard/progress values with API data. Consent starts unchecked; location is explicitly entered.
- Production startup rejects known default/short JWT and application secrets without echoing values. Operators must supply both strong secrets before deploying this backend.

Compatibility: existing routes and response fields remain; new fields and preview endpoint are additive. The old unconfirmed interview completion call intentionally fails with 409. This is the necessary safety exception: deploy a compatible preview backend to test the new frontend; do not point this interview flow at the unchanged production backend and call it operational. Existing stored evidence is not retroactively reclassified. Field-worker assignment policy is deferred and remains a separate authorization issue.

Verification: 53 backend tests pass, including confirmation/edit/stale-token/idempotency/consent, provenance, RED gating, dates, Unicode, ambiguity and secret guards; TypeScript and production build pass. One dependency deprecation warning remains. Frontend visual verification is blocked by Vercel Preview authentication; it is not claimed as complete.
