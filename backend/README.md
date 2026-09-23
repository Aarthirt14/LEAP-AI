# LEAP AI Backend

FastAPI and PostgreSQL backend for **Livelihood Enablement through AI Pathways** (SIH 26097).

## Core safety boundary

An LLM is never allowed to rank or select livelihood pathways. Language models may later help with conversation understanding, structured extraction, clarification questions, and plain-language explanations. Final pathway ranking is produced only by deterministic engines using stored evidence, explicit constraints, configurable weights, qualification validity, training availability, and historical outcomes.

## Architecture

```text
FastAPI routes
  -> JWT authentication and role checks
  -> application services
  -> deterministic engines
  -> SQLAlchemy repositories/models
  -> PostgreSQL (SQLite only for local tests)
```

Business rules are separated from route handlers:

- `app/engines/rpl_engine.py` — estimates competency overlap and labels only **Potential RPL Candidate**.
- `app/engines/aspiration_guard.py` — guarantees independent evaluation of aspirational and existing-strength paths. Gender and caste are discarded before scoring.
- `app/engines/constraint_engine.py` — rejects hard failures and returns explainable soft-penalty reason codes.
- `app/engines/pathway_engine.py` — applies the single configured weight set and returns at most three valid paths.
- `app/engines/confidence_engine.py` — produces GREEN, AMBER, or RED with explicit reasons.
- `app/services/intervention_service.py` — performs non-causal what-if feasibility simulations without mutating the real profile.
- `app/services/outcome_evidence_service.py` — aggregates outcomes and refuses to fabricate evidence below the minimum sample threshold.
- `app/services/mismatch_service.py` — uses configurable demand, capacity, and outcome thresholds.

## Database design

The schema preserves source evidence and provenance. Original interview transcripts are never overwritten by corrected text. One active `LivelihoodProfile` is enforced per beneficiary. Qualification validity, training verification, recommendation evidence, simulations, follow-ups, human-review actions, refresh tokens, sync versions, and audit logs are stored separately.

Indexes cover beneficiary district, qualification sector/validity, outcome day, pathway beneficiary, training district, and review status. Foreign keys use explicit delete behavior.

## Scoring

The weights are defined once in `app/config.py`:

| Factor | Weight |
|---|---:|
| Existing skill fit | 20% |
| Aspiration fit | 20% |
| Local opportunity | 15% |
| Eligibility | 15% |
| Mobility | 10% |
| Training burden | 10% |
| Outcome evidence | 10% |

Expired and invalid qualifications are excluded before scoring. Unknown validity lowers confidence. If fewer than three valid pathways exist, fewer are returned.

## Outcome metric

`Sustainable Livelihood Conversion Rate = beneficiaries active at 180 days / pathway completers`

Division by zero returns `0`. This is a prototype LEAP AI metric and **not an official PM-AJAY metric**. Qualification-level outcome evidence requires at least 20 beneficiary samples by default.

## Roles

- `BENEFICIARY`: own records, interviews, pathways and follow-ups only.
- `FIELD_WORKER`: assisted enrollment, non-sensitive updates, verification and follow-ups.
- `FACILITATOR`: RED-confidence reviews and resolution actions.
- `DISTRICT_OFFICER`: aggregate dashboard endpoints only; individual names are blocked.
- `ADMIN`: full system operations and diagnostics.

Public registration can create only beneficiary accounts. Privileged roles must be provisioned administratively.

## Local development

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python -m seed.seed_data
uvicorn app.main:app --reload
```

Windows activation:

```powershell
.venv\Scripts\activate
```

Swagger UI: `http://localhost:8000/docs`

The SQLite fallback works without `.env` and creates `leap_ai.db` locally.

## Docker

```bash
docker compose up --build
```

This starts FastAPI on port `8000` and PostgreSQL 16. Redis is intentionally not included.

## Tests

```bash
pytest -q
```

The suite covers invalid qualifications, RPL safeguards, aspiration protection, gender invariance, constraints, deterministic ranking, confidence escalation, immutable simulations, outcome math, consent, RBAC, aggregate-only officer access, and the complete Kavitha workflow.

## Demo data

Demo accounts and synthetic presentation data are disabled unless `DEMO_MODE=true` is set in the backend environment. The idempotent local seed command is:

```bash
DEMO_MODE=true python -m seed.seed_data
DEMO_MODE=true python -m seed.seed_data --reset
```

The five local accounts use `@demo.leapai.dev` addresses and the shared presentation password `LeapDemo@2026`. The seed creates Meena's Tamil beneficiary profile, tailoring skills, qualification competencies, realistic training distances, engine-generated pathways, a review case, follow-up data, and aggregate records. Passwords are stored only as Argon2 hashes. All domain demo records are explicitly `SYNTHETIC` or `UNVERIFIED`; they must never be presented as official PM-AJAY/NQR data. Keep `DEMO_MODE=false` outside a controlled prototype environment.

