# LEAP AI

### Livelihood Enablement through AI Pathways

LEAP AI is a voice-first livelihood decision-support platform for helping people discover practical education, training, and income pathways that fit their real circumstances.

The platform combines lived experience, existing skills, aspirations, qualification data, local training access, mobility, family responsibilities, and outcome evidence into recommendations that are explainable, auditable, and reviewable by people.

> **Core principle:** AI may assist with conversation and explanation, but it never makes the final livelihood decision. Pathway ranking is produced by deterministic backend engines using stored evidence and explicit rules.

## Why LEAP AI

Many livelihood systems treat informal experience and personal constraints as secondary details. LEAP AI treats them as decision-critical evidence.

- **Voice-first assessment** with text fallback for accessible beneficiary interviews
- **Multilingual entry experience** with English, Tamil, and Hindi support
- **Transparent recommendations** with evidence, scores, constraints, and confidence reasons
- **Recognition of Prior Learning** analysis based on matched and missing competencies
- **What-if simulation** for interventions such as nearby training or bridge courses
- **Human review workflow** for RED-confidence or uncertain recommendations
- **Role-specific workspaces** for beneficiaries, field workers, facilitators, district officers, and administrators
- **Aggregate district intelligence** for demand, training capacity, mismatch, and outcomes

## Product Flow

```text
Language selection
        |
        v
Beneficiary profile and voice assessment
        |
        v
Skills, constraints, aspirations, and RPL evidence
        |
        v
Deterministic pathway ranking
        |
        +--> Explainability and what-if simulation
        +--> Human review for low-confidence cases
        +--> Training, follow-up, and outcome tracking
```

## Role Workspaces

| Role | Route | Purpose |
| --- | --- | --- |
| Beneficiary | `/` | Complete an assessment, review skills, explore pathways, and understand recommendations |
| Field worker | `/field-worker` | Manage beneficiary worklists, assisted assessments, profiles, and follow-ups |
| Facilitator | `/review` | Inspect and resolve low-confidence human-review cases |
| District officer | `/officer` | View calculated district aggregates, demand, mismatch, and outcomes |
| Admin | `/admin` | Access system diagnostics and authorized operational views |

## Architecture

```text
Next.js / React frontend
        |
        v
FastAPI REST API + JWT authentication + role permissions
        |
        v
SQLAlchemy models and services
        |
        +--> RPL engine
        +--> constraint engine
        +--> aspiration guard
        +--> deterministic pathway engine
        +--> confidence engine
        +--> outcome evidence and mismatch services
        |
        v
SQLite for local development / PostgreSQL for deployment
```

### Decision safety boundary

The backend keeps conversational assistance separate from decision logic:

- The **RPL engine** estimates competency overlap and labels potential candidates. It does not grant official certification.
- The **constraint engine** identifies hard failures and explainable soft penalties.
- The **pathway engine** applies one configured scoring model and returns up to three valid routes.
- The **confidence engine** produces GREEN, AMBER, or RED confidence with explicit reasons.
- The **outcome evidence service** refuses to fabricate historical evidence below the configured sample threshold.
- The **intervention service** runs non-persistent what-if simulations without modifying the beneficiary profile.

## Technology Stack

### Frontend

- Next.js 16 and React 19
- TypeScript 5.9
- Tailwind CSS 4
- Lucide icons
- Sonner notifications

### Backend

- Python 3.12+
- FastAPI
- SQLAlchemy 2
- Pydantic 2
- Alembic
- SQLite for local development and tests
- PostgreSQL support for deployment
- JWT authentication with Argon2 password hashing

### Testing

- Pytest
- FastAPI `TestClient`
- TypeScript compiler
- Next.js production build

## Repository Layout

```text
LEAP-AI/
├── app/                  # Next.js App Router pages
├── components/           # Shared frontend shell and UI components
├── lib/                  # API client and translations
├── public/               # Static frontend assets
├── backend/
│   ├── app/              # FastAPI routes, engines, services, models
│   ├── alembic/          # Database migrations
│   ├── seed/             # Demo and reference-data seed commands
│   └── tests/             # Backend regression and integration tests
├── scripts/              # Local build and framework helpers
└── package.json          # Frontend scripts and dependencies
```

## Quick Start

### Prerequisites

- Node.js `>=22.13`
- Python `3.12+`
- pnpm `11+` or the repository's existing installed dependencies

### 1. Start the backend

Windows PowerShell:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m alembic upgrade head
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Linux/macOS:

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m alembic upgrade head
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Backend endpoints:

- Health: http://127.0.0.1:8000/health
- Swagger UI: http://127.0.0.1:8000/docs
- OpenAPI JSON: http://127.0.0.1:8000/openapi.json

### 2. Start the frontend

From the repository root:

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

The frontend uses `NEXT_PUBLIC_API_URL` when provided and otherwise defaults to `http://localhost:8000`.

### 3. Run checks

Frontend:

```bash
pnpm exec tsc --noEmit
pnpm build
```

Backend:

```bash
cd backend
python -m pytest -q
```

## Local Demo Mode

Demo accounts and synthetic presentation data are disabled by default. Enable them only in a local or controlled demo environment:

```powershell
cd backend
$env:DEMO_MODE="true"
python -m alembic upgrade head
python -m seed.seed_data
```

To reset only demo records and recreate them deterministically:

```powershell
python -m seed.seed_data --reset
```

### Demo accounts

All demo accounts use the password `LeapDemo@2026`.

| Role | Email |
| --- | --- |
| Beneficiary | `beneficiary.demo@demo.leapai.dev` |
| Field worker | `fieldworker.demo@demo.leapai.dev` |
| Facilitator | `facilitator.demo@demo.leapai.dev` |
| District officer | `officer.demo@demo.leapai.dev` |
| Admin | `admin.demo@demo.leapai.dev` |

When `DEMO_MODE=true`, `/auth` displays transparent role buttons that auto-fill the appropriate local demo credentials. The frontend does not show these controls when demo mode is disabled.

### Seeded presentation scenario

The demo seed creates:

- Meena, a 34-year-old Tamil-speaking beneficiary from Madurai
- Tailoring, measurement, and garment-repair experience
- Tailoring qualification competencies for RPL evidence
- Local training opportunities with realistic distance barriers
- Engine-generated pathways and explainability evidence
- A low-confidence review case for facilitator inspection
- Field-worker worklist, pending assessment, and follow-up records
- Outcome records used by district aggregate dashboards

All scores are generated by backend logic. Seed data is synthetic and must not be presented as official PM-AJAY, NQR, or employment evidence.

## Configuration

Backend settings are read from environment variables or `backend/.env`.

Important settings:

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./leap_ai.db` | Database connection string |
| `JWT_SECRET` | development value | Secret used to sign JWTs; replace outside local development |
| `SECRET_KEY` | development value | Application secret; replace outside local development |
| `FRONTEND_URL` | localhost origins | Comma-separated CORS origins |
| `DEMO_MODE` | `false` | Enables local demo seed and demo login controls |
| `MINIMUM_OUTCOME_SAMPLES` | `20` | Minimum sample size for historical outcome evidence |

Never enable `DEMO_MODE` in production unless the environment is explicitly isolated for a controlled presentation.

## Testing Scope

The backend suite covers:

- Deterministic ranking and confidence escalation
- RPL and aspiration safeguards
- Invalid and expired qualification handling
- Constraint and mobility behavior
- Immutable what-if simulations
- Outcome aggregation and evidence thresholds
- Beneficiary consent and access isolation
- Field-worker, facilitator, officer, and admin permissions
- Aggregate-only district officer access
- Integration journey from assessment to pathway and outcome

## Security and Data Principles

- Passwords are hashed with Argon2 and are never stored in plaintext.
- Public registration can create beneficiary accounts only.
- Privileged roles are provisioned administratively or through controlled demo seeding.
- Beneficiary access is restricted to authorized records.
- District officer endpoints return aggregates rather than sensitive beneficiary details.
- Original interview transcripts remain preserved when corrections are added.
- Synthetic records are marked as synthetic or unverified.
- Demo reset is CLI-only; no public destructive reset API is exposed.

## Project Status

This repository contains a functional prototype suitable for local evaluation and presentation. Production deployment still requires environment-specific secrets, infrastructure configuration, operational monitoring, data governance review, and validated real-world reference data.

## License

No license is currently declared in this repository.
