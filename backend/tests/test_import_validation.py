import json
from datetime import date, timedelta
from app.services.data_ingestion import NQRAdapter, TrainingAdapter, ingest


def qualification(**changes):
    return {'qualification_code': 'TEST/Q1', 'qualification_name': 'Test qualification',
            'nsqf_level': 3, 'source_url': 'https://www.nqr.gov.in/qualifications/example',
            'valid_from': str(date.today() - timedelta(days=20)),
            'valid_until': str(date.today() + timedelta(days=20)), **changes}


def run_import(tmp_path, rows, adapter=None, key='qualification_code'):
    path = tmp_path / 'records.json'
    path.write_text(json.dumps(rows))
    return ingest(adapter or NQRAdapter(), path, key)


def test_expired_future_and_malformed_rows_never_import(tmp_path):
    records, report = run_import(tmp_path, [
        qualification(), qualification(),
        qualification(qualification_code='OLD', valid_until=str(date.today()-timedelta(days=1))),
        qualification(qualification_code='FUTURE', valid_from=str(date.today()+timedelta(days=1))),
        qualification(qualification_code='BAD-DATE', valid_until='bad'),
        qualification(qualification_code='FAKE-SOURCE', source_url='https://nqr.gov.in.evil.example/1'),
        qualification(qualification_code='NO-LEVEL', nsqf_level=None), None,
    ])
    assert len(records) == 1
    assert report['valid'] == report['expired'] == report['not_yet_valid'] == report['duplicate'] == 1
    assert report['invalid'] == 4


def test_unverified_training_stays_unverified_and_fake_verification_rejected(tmp_path):
    base = {'provider_name': 'Example', 'district': 'Example district'}
    records, report = run_import(tmp_path, [
        {**base, 'id': '1'},
        {**base, 'id': '2', 'verification_status': 'VERIFIED', 'source_type': 'SYNTHETIC'},
        {**base, 'id': '3', 'verification_status': 'VERIFIED'},
    ], TrainingAdapter(), 'id')
    assert len(records) == 1 and records[0]['verification_status'] == 'UNVERIFIED'
    assert report['invalid'] == 2


def test_missing_dates_reversed_dates_and_non_object_payload(tmp_path):
    records, report = run_import(tmp_path, [qualification(valid_from=''), qualification(valid_from='2099-01-01')])
    assert not records and report['invalid'] == 2
