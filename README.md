# LEAP-AI

LEAP-AI is a full-stack SIH prototype for converting a beneficiary's verified qualifications, lived experience, aspirations, and constraints into explainable education, training, and livelihood pathways.

## Repository structure

- The repository root contains the existing React/Vite frontend.
- `backend/` contains the FastAPI API, deterministic decision engines, database schema, migrations, seed data, tests, and Docker configuration.

## Run the frontend

```bash
pnpm install
pnpm dev
```

## Run the backend locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python -m seed.seed_data
uvicorn app.main:app --reload
```

Open Swagger at http://localhost:8000/docs.

## Run the backend with Docker

```bash
cd backend
cp .env.example .env
docker compose up --build
```

## Tests

```bash
cd backend
pytest -q
```

All seeded people, qualifications, opportunities, and outcomes are synthetic and unverified demo data. Pathway ranking is deterministic and auditable; an LLM must not make eligibility, scoring, or final recommendation decisions.
