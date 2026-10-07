"""Import factual catalogue fields from pinned public archives, never eligibility.

Usage: python scripts/import_catalogue_archive.py /path/to/input-directory
Inputs: nsqf-qualifications.json and pmajay-courses.json. No network or DB writes.
The upstream keywords and Hindi translations are deliberately not imported.
"""
import argparse
from datetime import date
import hashlib
import json
from pathlib import Path

COMMIT = 'd1cd2c4905f99978c852e74ac6ce84e2a867886a'
BASE = f'https://github.com/varuntutejaa/Saksham/blob/{COMMIT}/server/prisma/data/'


def text(row, key):
    value = row.get(key)
    if not isinstance(value, str) or not value.strip() or len(value) > 1000:
        raise ValueError(f'Invalid {key}')
    return value.strip()


def build_catalogue(inputs, retrieved_on):
    date.fromisoformat(retrieved_on)
    records, sources = [], []
    for kind, filename, official in (
        ('NQR', 'nsqf-qualifications.json', 'https://www.nqr.gov.in/'),
        ('PMAJAY', 'pmajay-courses.json', 'https://pmajay.dosje.gov.in/CourseList'),
    ):
        raw = (inputs / filename).read_bytes()
        rows = json.loads(raw)
        if not isinstance(rows, list) or not rows:
            raise ValueError('Expected non-empty source array')
        seen = set()
        for row in rows:
            identity = row.get('nqrId' if kind == 'NQR' else 'srNo')
            if type(identity) is not int or identity <= 0 or identity in seen:
                raise ValueError('Duplicate or invalid source ID')
            seen.add(identity)
            record = {
                'id': f'{kind}:{identity}', 'source': kind,
                'source_record_id': str(identity), 'sector': text(row, 'sector'),
                'review_status': 'AWAITING_OFFICIAL_RECHECK',
                'recommendation_eligible': False,
                'batch_availability': 'UNVERIFIED',
                'title': text(row, 'title' if kind == 'NQR' else 'subCourseName'),
                'code': text(row, 'qpCode' if kind == 'NQR' else 'subCourseCode'),
                'source_url': f'https://www.nqr.gov.in/qualifications/{identity}' if kind == 'NQR' else official,
            }
            if kind == 'NQR':
                level, hours = row.get('nsqfLevel'), row.get('notionalHours')
                if type(level) not in (int, float) or not 1 <= level <= 10:
                    raise ValueError('Invalid NSQF level')
                if hours is not None and (type(hours) not in (int, float) or not 0 <= hours < 100000):
                    raise ValueError('Invalid duration')
                record.update(nsqf_level=level, awarding_body=text(row, 'ssc'), duration_hours=hours)
            else:
                # Scope is not an NSQF level; catalogue listing is not funding approval.
                record.update(course_scope=text(row, 'courseLevel'), course_group=text(row, 'courseName'), sub_sector=text(row, 'subSector'))
            records.append(record)
        sources.append({
            'id': kind, 'official_url': official, 'archive_url': BASE + filename,
            'archive_commit': COMMIT, 'archive_sha256': hashlib.sha256(raw).hexdigest(),
            'retrieved_on': retrieved_on, 'official_checked_on': None,
            'record_count': len(rows),
        })
    return {'schema_version': 1, 'purpose': 'DISCOVERY_ONLY', 'sources': sources, 'records': records}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('inputs', type=Path)
    parser.add_argument('--retrieved-on', required=True, help='Actual archive download date, not an official review date')
    parser.add_argument('--output', type=Path, default=Path('data/catalogue-archive.json'))
    args = parser.parse_args()
    document = build_catalogue(args.inputs, args.retrieved_on)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix('.tmp')
    temporary.write_text(json.dumps(document, ensure_ascii=False, separators=(',', ':')) + '\n')
    temporary.replace(args.output)
    print(json.dumps({'records': len(document['records']), 'sources': document['sources']}))


if __name__ == '__main__':
    main()
