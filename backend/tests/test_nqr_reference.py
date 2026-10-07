from copy import deepcopy
from datetime import date
import json
from pathlib import Path
import pytest
from seed.import_nqr_reference import validate_catalogue

PATH = Path(__file__).resolve().parents[2] / 'data' / 'nqr-reference.json'


def records():
    return json.loads(PATH.read_text())


def test_real_snapshot_and_preserved_alternative_routes():
    data = records()
    assert validate_catalogue(data, date(2026, 10, 7)) == {'records': 3, 'expired': 0, 'review_due': 0}
    assert [len(r['eligibility_routes']) for r in data['records']] == [5, 5, 2]
    assert data['records'][1]['duration_hours_max'] > data['records'][1]['duration_hours_min']
    assert validate_catalogue(data, date(2029, 1, 1)) == {'records': 3, 'expired': 3, 'review_due': 3}


@pytest.mark.parametrize('change', [
    {'source_url': 'https://nqr.gov.in.evil.example/qualifications/11689'},
    {'source_url': 'https://www.nqr.gov.in/qualifications/13239'},
    {'source_checked_on': '2099-01-01'},
    {'batch_availability': 'AVAILABLE'},
    {'eligibility_routes': []},
    {'duration_hours_min': 1000},
])
def test_import_rejects_unsupported_claims_and_invalid_metadata(change):
    data = deepcopy(records())
    data['records'][0].update(change)
    with pytest.raises(ValueError):
        validate_catalogue(data, date(2026, 10, 7))


def test_duplicate_registry_record_rejected():
    data = records()
    data['records'].append(data['records'][0])
    with pytest.raises(ValueError):
        validate_catalogue(data, date(2026, 10, 7))
