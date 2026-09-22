# LEAP AI — Livelihood Enablement through AI Pathways

LEAP AI is a clean, functional full-stack livelihood decision-support application designed for PM-AJAY beneficiaries. It transforms beneficiary interviews, verified qualifications, lived experience, personal aspirations, and practical constraints into transparent, auditable education, training, and livelihood pathways.

## Current Project Status

- **Status**: Production-Ready / Fully Functional Full-Stack Application
- **Backend Test Suite**: 100% passing rate (26 unit and regression tests covering API security, decision engines, integration flows, CORS parsing, read-only simulation, and traceable evidence).
- **Frontend Build**: 100% clean Next.js/App-Router build with explicit route pages (`/`, `/auth`, `/onboarding`, `/interview`, `/profile`, `/pathways`, `/pathway`, `/officer`, `/field-worker`).
- **UI Design System**: Modern high-contrast styling with slate/navy typography for maximum accessibility and readability.

---

## Core Features

### 1. Voice-First & Conversational Livelihood Assessment
- Integrates browser Web Speech API for voice responses with fallback to natural text entry.
- Captures qualitative answers across education, informal skills, family occupation, career aspirations, travel range, capital, hours, and physical constraints.

### 2. Verified Livelihood Profile Engine
- Builds structured profiles from beneficiary interview facts.
- Tracks real profile metrics including completion percentage, physical constraints, and family responsibilities.

### 3. Deterministic Pathway Recommendation Engine
- Applies rule-based scoring across 7 objective factors:
  - Skill Fit Score
  - Aspiration Fit Score
  - Opportunity Score
  - Eligibility Score
  - Mobility Score
  - Training Burden Score
  - Outcome Evidence Score
- Outlines pathway routes: RPL (Recognition of Prior Learning), RPL or Bridge Training, Bridge Training, or Full Training.
- Flags low-confidence recommendations for human review.

### 4. Traceable Recommendation Evidence
- Generates evidence records grounded strictly in beneficiary profile data, qualification criteria, local training centres, and constraint engine outputs.

### 5. Read-Only Pathway Simulation
- Allows beneficiaries and field workers to simulate interventions (such as reduced travel distance or bridge training enablement) to preview updated fit scores without mutating stored beneficiary profile state.

### 6. Configurable CORS & Security Architecture
- Supports parsed origins across development and production environments (`localhost`, `127.0.0.1`, ports 3000, 5173, 8787).
- Token-based JWT authentication with role enforcement (`BENEFICIARY`, `FIELD_WORKER`, `DISTRICT_OFFICER`, `ADMIN`).

---

## Repository Structure

- `backend/`: FastAPI application, SQLAlchemy ORM models, Alembic migrations, decision engines, seed data, and pytest suite.
- `app/`: Next.js App Router explicit route pages (`page.tsx`, `auth/`, `onboarding/`, `interview/`, `profile/`, `pathways/`, `pathway/`, `officer/`, `field-worker/`).
- `components/`: UI components (`leap-app.tsx`, shadcn/ui base elements).
- `lib/`: Frontend API client and token management (`api.ts`).

---

## Quick Start

### 1. Run the Backend

```bash
cd backend
# Activate virtual environment
.\.venv\Scripts\activate   # Windows
# or: source .venv/bin/activate # Linux/macOS

# Apply database migrations
python -m alembic upgrade head

# Seed initial data (if needed)
python -m seed.seed_data

# Start FastAPI server on port 8000
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
- API Health Check: http://127.0.0.1:8000/health
- Swagger OpenAPI Docs: http://127.0.0.1:8000/docs

### 2. Run Backend Tests

```bash
cd backend
python -m pytest
```

### 3. Run the Frontend

```bash
# Build the production bundle
npm run build

# Start the frontend production server on port 8787
npm run start
```
- Frontend Application URL: http://127.0.0.1:8787

---

## Technology Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2, Alembic, SQLite / PostgreSQL.
- **Frontend**: React 19, Next.js / Vinext, Tailwind CSS v4, Lucide Icons, Sonner notifications.
- **Testing**: Pytest, Starlette TestClient.
