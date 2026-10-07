"""Validate a manually reviewed NQR snapshot; never infer live batches or eligibility.

From repository root:
  python backend/seed/import_nqr_reference.py data/nqr-reference.json
  python backend/seed/import_nqr_reference.py reviewed.json --output data/nqr-reference.json
"""
import argparse
from datetime import date
import json
from pathlib import Path
import re


def validate_catalogue(document: dict, today: date | None = None) -> dict:
    today = today or date.today()
    if not isinstance(document, dict) or document.get('schema_version') != 1:
        raise ValueError('Expected catalogue schema_version 1')
    rows = document.get('records')
    if not isinstance(rows, list) or not rows:
        raise ValueError('A non-empty records list is required')
    seen = set()
    summary = {'records': len(rows), 'expired': 0, 'review_due': 0}
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError('Each record must be an object')
        identity = row.get('registry_id')
        if not isinstance(identity, str) or not identity.isdigit() or identity in seen:
            raise ValueError('Registry IDs must be unique numeric strings')
        seen.add(identity)
        if not re.fullmatch(r'https://(?:www\.)?nqr\.gov\.in/qualifications/' + identity, row.get('source_url', '')):
            raise ValueError('Source URL must match the NQR registry ID')
        for key in ('title', 'sector', 'awarding_body', 'summary'):
            if not isinstance(row.get(key), str) or not row[key].strip():
                raise ValueError(f'Missing {key}')
        for key in ('eligibility_routes', 'nos_codes'):
            if not isinstance(row.get(key), list) or not row[key] or any(not isinstance(v, str) or not v.strip() for v in row[key]):
                raise ValueError(f'{key} must preserve non-empty source details')
        level = row.get('nsqf_level')
        if isinstance(level, bool) or not isinstance(level, (int, float)) or not 1 <= level <= 10:
            raise ValueError('Invalid NSQF level')
        minimum, maximum = row.get('duration_hours_min'), row.get('duration_hours_max')
        if type(minimum) is not int or type(maximum) is not int or not 0 < minimum <= maximum:
            raise ValueError('Invalid training duration range')
        approved, expires, checked = (date.fromisoformat(row[k]) for k in ('originally_approved_on', 'valid_until', 'source_checked_on'))
        if approved > expires or checked > today or checked < approved:
            raise ValueError('Inconsistent or future source-check dates')
        if row.get('batch_availability') != 'UNVERIFIED':
            raise ValueError('A qualification reference cannot certify batch availability')
        summary['expired'] += expires < today
        summary['review_due'] += (today - checked).days > 30
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('--output', type=Path, help='Write validated reference snapshot; no database writes')
    args = parser.parse_args()
    document = json.loads(args.input.read_text(encoding='utf-8'))
    report = validate_catalogue(document)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        temporary = args.output.with_suffix(args.output.suffix + '.tmp')
        temporary.write_text(json.dumps(document, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        temporary.replace(args.output)
    print(json.dumps(report))


if __name__ == '__main__':
    main()
