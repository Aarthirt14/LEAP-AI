"""Import reviewed NQR references into the configured database; dry-run by default.

cd backend
python -m seed.load_nqr_database ../data/nqr-reference.json
python -m seed.load_nqr_database ../data/nqr-reference.json --apply
"""
import argparse
from copy import deepcopy
from datetime import date, datetime, timezone
import hashlib
import json
from pathlib import Path
from sqlalchemy import select
from app.engines.eligibility_engine import validate_rules
from app.models import Qualification, SourceType, ValidityStatus
from seed.import_nqr_reference import validate_catalogue


def import_catalogue(db, document, *, apply=False, today=None):
    today = today or date.today()
    validate_catalogue(document, today)
    for record in document['records']:
        validate_rules(record.get('eligibility_rules'))
        if [r['summary'] for r in record['eligibility_rules']] != record['eligibility_routes']:
            raise ValueError('Structured routes must preserve the reviewed source alternatives')
    report = {'created': 0, 'updated': 0, 'unchanged': 0, 'apply': apply}
    for record in document['records']:
        code = f'NQR:{record["registry_id"]}'  # Internal registry key, never a claimed QP code.
        row = db.scalar(select(Qualification).where(Qualification.qualification_code == code))
        if row and row.source_type != SourceType.NQR:
            raise ValueError('Refusing to overwrite a non-NQR record')
        snapshot = deepcopy(record)
        snapshot['schema_version'] = document['schema_version']
        snapshot['sha256'] = hashlib.sha256(json.dumps(record, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        desired_status = ValidityStatus.EXPIRED if date.fromisoformat(record['valid_until']) < today else ValidityStatus.VALID
        if row and row.source_metadata == snapshot and row.validity_status == desired_status:
            report['unchanged'] += 1
            continue
        report['updated' if row else 'created'] += 1
        if not apply:
            continue
        if row is None:
            row = Qualification(qualification_code=code)
            db.add(row)
        row.qualification_name = record['title']
        row.occupational_role = record['title']
        row.sector = record['sector']
        row.nsqf_level = str(record['nsqf_level'])
        # Alternatives belong in metadata, never a flattened education threshold.
        row.minimum_education = None
        row.minimum_experience_years = 0
        row.duration_hours = record['duration_hours_max']
        row.qualification_type = 'NQR reference; provider confirmation required'
        row.valid_from = None  # Original approval does not establish version-valid-from.
        row.valid_until = date.fromisoformat(record['valid_until'])
        row.validity_status = desired_status
        row.source_url = record['source_url']
        row.source_type = SourceType.NQR
        row.last_verified_at = datetime.combine(date.fromisoformat(record['source_checked_on']), datetime.min.time(), tzinfo=timezone.utc)
        row.source_metadata = snapshot
    # Caller owns the transaction; no partial commit on later validation errors.
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    document = json.loads(args.input.read_text(encoding='utf-8'))
    from app.database import SessionLocal
    with SessionLocal.begin() as db:
        print(json.dumps(import_catalogue(db, document, apply=args.apply)))


if __name__ == '__main__':
    main()
