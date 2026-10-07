# Production release and operations

## Public entry points

- App: https://leap-ai-khaki.vercel.app/
- Role tours: https://leap-ai-khaki.vercel.app/demo
- Accounts: https://leap-ai-khaki.vercel.app/auth
- Backend: https://leap-ai-production.onrender.com

The October 7 consolidation replaces the frontend's old backend connection with a fresh Render API and PostgreSQL database, as authorized by the owner. Existing records and accounts from the old backend are not migrated or deleted. Do not connect production to the disposable staging database.

## Infrastructure

`render.yaml` creates `leap-ai-production` and `leap-ai-production-db`. Render generates the server secrets and wires the database over its private network. Startup applies Alembic migrations. `ENVIRONMENT=production`, `DEMO_MODE=false`, and `AI_INTERVIEW_ENABLED=false`. CORS permits the production frontend. Public role tours use a local, read-only synthetic snapshot, without real staff credentials.

Vercel's production `NEXT_PUBLIC_API_URL` points to the fresh API. The build creates same-origin `/leap-api` rewrites with `Cache-Control: no-store`; real requests still require backend authentication. Development without Vercel continues to use the configured API directly.

## Hosting limits and data setup

- The free API sleeps when idle; the first request can take 50 seconds or more.
- Free Render PostgreSQL expires 30 days after creation. Upgrade or migrate before the expiry shown in the database dashboard. Do not rely on it for long-term beneficiary records.
- The fresh database starts empty. Real accounts must register again. Provision staff deliberately; do not enable public staff signup.
- Validated qualification and local opportunity records still need importing. An empty real catalogue yields no recommendations; role tours supply synthetic examples separately.

## Verification

Local release checks: 96 backend tests passed; ten-language and public-demo isolation checks passed; TypeScript and the Next.js production build passed. The production build's route manifest includes the API relay and no-store headers. Hosted verification is recorded after deployment.

## Future releases

Keep production on `main`. Use branch previews for development. Check migrations, backend health and matching interview endpoints before releasing frontend changes. Verify the public domain, account flow, all role tours and nested route refresh after deployment.

Rollback with a provider deployment rollback or normal Git revert; never force-push main or reset beneficiary records. Preserve the database and server secrets during rollback. Do not switch the frontend back to an inaccessible backend without verifying compatibility.
