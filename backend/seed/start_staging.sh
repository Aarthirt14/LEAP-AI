#!/bin/sh
set -eu
# Refuse a wrong target before migrations or any fixture writes.
python -c 'import os; from seed.staging_fixtures import validate_target; validate_target(os.environ)'
alembic upgrade head
python -m seed.staging_fixtures
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
