#!/bin/sh
set -eu
alembic upgrade head
# Reviewed public catalogue only; never creates users, batches or synthetic fixtures.
python -m seed.load_nqr_database seed/data/nqr-reference.json --apply
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
