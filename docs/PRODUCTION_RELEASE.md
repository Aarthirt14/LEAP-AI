# Coordinated release to the existing production domain

Target: https://leap-ai-khaki.vercel.app with API https://leap-ai-l6n2.onrender.com. Both production services must keep tracking `main`. Source branch: `redesign/leap-ui-v2`; review PR #5. Do not force-push, seed demonstration accounts in production, or merge automatically.

## Verified preparation

- Redesign Preview deployed and all five credential-free demo roles visually inspected.
- TypeScript, Next.js build, language checks and demo isolation checks passed. Backend suite: 92 passed.
- Public demo is local/read-only, requires no DEMO_MODE and grants no real role privileges.
- No database model or Alembic version changes relative to production baseline 6493e3758674f4b59b81cd8bbcffc7a54c3c673c; startup still runs `alembic upgrade head`.
- On October 5 the production OpenAPI document still lacked `/api/interviews/{session_id}/preview` and `/api/interviews/assistance/config`. The redesigned frontend cannot be released against that old API as a complete working system.

## Release prerequisites still unverified

The agent could not inspect the production Render service: the cloud browser blocked observation under native credential protection. No production environment values were read, changed or logged. A prior signed-in workspace did not expose the LEAP production service. These facts do not prove the service is unhealthy; they mean release readiness has not been established.

A service owner must provide access to the **production** Render service (not leap-ui-v2-staging) or verify these items without sharing secret values:

- Correct repository and `main` branch; normal production startup, not `seed/start_staging.sh`.
- Production database URL, persistent storage and a recoverable backup. Do not repoint production to ephemeral staging SQLite.
- `ENVIRONMENT=production`, non-default `JWT_SECRET` and `SECRET_KEY` of at least 32 characters. New code rejects unsafe defaults at startup. Preserve an existing valid JWT secret; changing it invalidates sessions.
- `DEMO_MODE=false`; no staging fixture activation or public staff credentials.
- `FRONTEND_URL` includes the exact production origin.
- Vercel Production `NEXT_PUBLIC_API_URL` points to the production API. Preview-only relay settings must not be copied to production.
- Optional OpenAI assistance stays disabled unless separately configured and verified. It is not required for public tours or the deterministic core.

## Release sequence

1. Complete the prerequisites and explicitly approve PR #5 for merge, respecting the existing no-automatic-merge instruction.
2. Coordinate the merge/deploy so the backend update is healthy before advertising the redesigned live workflows. Both services auto-deploy from main; confirm actual revisions rather than assuming simultaneous success.
3. Check backend health/database and required OpenAPI routes. Verify production CORS and registration/login with a consented disposable test account.
4. Verify production interview draft → edit → confirmation, profile/skills, pathways, review gating and unauthorized role access. Do not approve livelihood decisions using real beneficiary data merely as a test.
5. Verify the public production `/demo` across all roles, nested route refresh and mobile layout; no Vercel Preview protection should block the production link.
6. Update the README link status only after the production deployment and smoke checks succeed.

If deployment fails, restore the last known working deployments using the providers' rollback controls or a normal revert commit. Do not force-push main or reset production data. Preserve relevant logs without copying credentials or beneficiary information into public issues.
