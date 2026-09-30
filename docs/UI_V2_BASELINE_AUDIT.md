# LEAP UI v2 — baseline audit and execution plan

Date: 2026-09-30
Repository: Aarthirt14/LEAP-AI
Audited main: 6493e3758674f4b59b81cd8bbcffc7a54c3c673c
Development branch: redesign/leap-ui-v2

## Baseline acquisition and checks

The private repository could not be cloned with the shell's available Git credentials. The authorized GitHub connector retrieved the main branch, recursive tree, and all 117 tracked files. Every file blob hash and the complete tree hash were verified. The original signed commit was reconstructed and its SHA verified exactly. This is an exact shallow checkout of the upstream commit, not the unrelated local Sites project. No successful git fetch/pull is claimed.

The working tree was clean before baseline checks. TypeScript changed the tracked generated tsconfig.tsbuildinfo; only that generated change was restored before creating the new branch. The new branch exists locally and on GitHub at the audited main commit. No production application code, secrets, environment variables, database, branch configuration, or deployment setting was changed.

| Check | Result |
| --- | --- |
| pnpm install --frozen-lockfile | PASS |
| python -m pytest -q in backend | PASS: 34 tests; one dependency deprecation warning |
| pnpm exec tsc --noEmit | PASS |
| pnpm build | PASS; all 12 application routes and not-found generated |
| Production frontend HTTP | 200 |
| Render /health | healthy; database connected; environment production |
| GitHub Vercel status for audited commit | success |
| Exact Vercel production-alias revision | Not independently confirmed; commit status alone is insufficient |
| Exact Render deployed revision | Not exposed by health response; not confirmed |
| Production landing visual inspection | Performed in cloud browser at desktop size |
| Local running UI | next dev starts on port 3010; cloud browser rejects localhost with ERR_BLOCKED_BY_CLIENT |
| Authenticated/manual mobile journey checks | Not yet performed; not claimed as passing |

A successful deployment status is not proof that a production alias still points to that deployment. Obtain current Vercel production deployment and Render live deployment Git SHAs before treating production matching as verified. Both are expected to match the audited main SHA; if different, investigate before redesign.

## Findings

These are code findings unless specifically marked as visually observed. Production configuration and live database content have not been inspected. Severity reflects the consequence, not evidence of an exploited production incident.

### CRITICAL

- No critical incident was established. A conditional critical risk exists: backend/app/config.py accepts known development JWT/secret defaults even when environment is production. There is no startup rejection. Confirm production uses strong secrets; do not fetch or print their values. If defaults are in use, account impersonation is possible. A targeted production startup guard is justified separately from visual work.

### HIGH

1. **Field-worker access is not assignment-scoped.** backend/app/dependencies.py permits workers to read/write any beneficiary. backend/app/api/routes/field_worker.py returns all beneficiaries and accepts updates by ID without assignment checks. No assignment model exists. Do not claim workers see only authorized assigned people. Resolving this requires an explicit assignment policy and backend work; created_by is not automatically a valid substitute for assignment.
2. **Verification provenance is client-controlled.** beneficiaries.py accepts verified and source in skill submissions; outcomes.py accepts verification_status from beneficiary input. profile_service.py marks extracted facts verified solely from client-supplied extraction_confidence. The UI supplies a fixed 0.9, so unreviewed answers become verified facts. This needs server enforcement and role-based regression tests.
3. **Interview confirmation is missing.** Interview immediately saves answers and completes profile extraction, without the required fact confirmation/edit step. Speech/extraction confidence values are invented. No robust finalization retry state exists if completion succeeds but subsequent skill/pathway calls fail.
4. **Outcome claims exceed filtering.** outcome_evidence_service.py does not filter qualification scoring inputs by verification provenance, while pathway_service.py labels resulting evidence verified. Unverified or user-reported outcomes can influence a purported verified score.
5. **Qualification expiry dates are not enforced at ranking time.** pathway_engine.py excludes EXPIRED/INVALID enum values but does not check valid_from/valid_until. pathway_service.py does not pass dates into ranking. A stale VALID record can remain eligible after its date expires.
6. **Synthetic availability is presented as practical opportunity.** seed data includes invented centres/seats. Ranking gives opportunity credit based on seats/distance without requiring verified provenance. The detail UI displays evidence values without visibly carrying their verification state.
7. **Live-looking hardcoded data.** BeneficiaryDashboard displays 72% and three options regardless of backend data. ProgressScreen always shows pending/no follow-ups and never calls the outcome API.
8. **Consent/location defaults.** Onboarding prechecks consent, defaults language to Tamil, and sends Tamil Nadu regardless of the chosen language or actual state.
9. **Multilingual input is not multilingual understanding.** Browser STT sets a language, but skill_ontology.py strips characters outside a-z/0-9; Tamil/Hindi occupation text loses meaning. Education matching uses English substrings. UI translation does not fix this.
10. **Human review does not gate beneficiary display.** RED pathways remain in beneficiary API results; UI wording claims uncertain cases are reviewed before reaching beneficiaries. Review actions update review rows but do not change pathway status, and the client always submits a fixed presentation note.

### MEDIUM

- Field-worker actions link to beneficiary-only pages; RequireBeneficiary then sends staff to onboarding. The query-selected beneficiary effect does not depend on search parameters, so selecting a worklist item without a pathname change can fail.
- Staff mobile navigation is hidden unless state.beneficiary exists; staff sessions intentionally do not load a beneficiary.
- API errors are swallowed in worker/officer/review/admin views, which can display empty or indefinitely loading results as if there is no data.
- Profile is read-only despite existing PATCH APIs; physical/family constraints are included in a local details array but omitted from rendered sections.
- Officer endpoints accept district and other filters that are inconsistently or not applied; 'profiled' counts beneficiary rows, not completed profiles. Several richer endpoints exist but are not wired into the UI.
- Session initialization clears tokens on every failure, including transient network failures. The client stores a refresh token but does not use the refresh API.
- Confidence reasons are computed but not persisted/exposed directly in PathwayOut. constraints, rpl_status and required_interventions have defaults rather than fully populated persisted values. Frontend must not infer these defaults are confirmed evidence.
- Profile-to-ranking mapping omits physical constraints and work-hour details; capital requirements are not passed from qualification records. Existing explanatory copy overstates constraint coverage.
- Regeneration deletes proposed pathways, potentially affecting associated reviews/history depending on database foreign-key behavior. Requires lifecycle regression coverage before altering it.
- No frontend integration for existing what-if API; the simulation uses heuristic score increments and must not be represented as a recomputation of the actual ranking or a causal forecast.
- Offline sync stores generic records but does not apply them to beneficiary entities. No functioning PWA/offline submission flow or provider abstraction was found.
- Localization is partial; many screens remain English. HTML lang stays en.
- No actual backend extraction preview endpoint exists. A frontend transcript review must not be labelled confirmed structured extraction unless it displays the actual normalized values used by the backend.

### LOW

- Visually observed literal translation key common.years on the production landing page.
- Landing illustration says Listening while no microphone is active and shows example skill tags without a clear explanatory distinction.
- Mixed blue/purple styles, dense badges, limited narrative sections, and duplicated navigation targets weaken hierarchy.
- Some controls fall below 44px, input focus styling is inconsistent, and textareas need explicit accessible labels.
- Generated tsconfig.tsbuildinfo is tracked; baseline checks dirty it.
- Most frontend logic is concentrated in a 1,147-line component file; reusable components should be extracted gradually, preserving contracts.

## What is already implemented

- Twelve explicit Next.js application routes plus not-found; Suspense around pathway query reading.
- FastAPI registration restricted to beneficiary role, Argon2 password hashing, JWT token-type checking and refresh rotation.
- Beneficiary ownership checks and officer aggregate-only restriction.
- Interview transcript storage, corrected text API, profile/skills persistence, deterministic weighted ranking, RPL matching, confidence calculation, review records, outcome APIs, simulation and import adapters.
- All existing 34 backend tests pass. They do not cover all issues above.
- CSV/JSON source adapters and provenance fields exist; they are not live official integrations.

## Updated milestones and implementation boundaries

1. Audit current main: baseline checks and code review completed; production commit verification remains open. Preserve this report on redesign/leap-ui-v2.
2. Frontend redesign, in order: shared tokens/components; header; landing; auth; onboarding; interview; pathways; detail; profile; worker; facilitator; officer; progress; remaining routes. Navy #071A3D, saffron #F28C45, green #0FA968, ivory #FFFDFC; soft tints #FFF1E6/#EAF8F1/#EEF3FA. Use dark enough foreground/button shades for contrast. No government emblems or copied branding.
3. End-to-end regression and visual verification: run app, inspect desktop/mobile, exercise registration through outcomes and all roles, localization, nested refresh, unauthorized access, and failure states. Run backend tests, types and production build again. Build success alone is insufficient.
4. Credibility improvements: real evidence and missing-data states, RPL caveats, confidence reasons, escalation, consent/privacy, action plan; then investigate official source provenance, terms, dates and update mechanisms.
5. Voice/connectivity: inspect STT/TTS/provider boundaries, safe retries, opt-in drafts and low-network behavior; label future channel adapters as future.

Each milestone report must state files changed, tests and outcomes, visual checks, limitations and next work. Backend changes need a specific reason, minimal compatible implementation and tests. Security/ranking changes must not be hidden in a frontend styling commit.

## Deployment and testing safeguards

- main remains the production baseline for Vercel and Render according to user configuration.
- Develop only on redesign/leap-ui-v2; no automatic merge, force-push or production settings changes.
- Use existing production backend only for appropriate preview/read-only comparison. Run destructive or repeatable mutation tests against an isolated local/test database; do not populate production with automated fixtures.
- Vercel Preview must have compatible backend URL/CORS; do not change production CORS or environment silently.
- No application redesign is represented as completed by this audit.
