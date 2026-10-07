import pytest
from pydantic import ValidationError
from app.engines.eligibility_engine import evaluate_eligibility, validate_rules
from app.schemas.api import QualificationEligibilityFacts
from evaluation.run_scenarios import evaluate


def test_beneficiary_scenarios_and_ranking_guards():
    report = evaluate()
    assert report['passed'] == report['cases'], report
    assert report['human_speakers_tested'] == 0


@pytest.mark.parametrize('field', ['can_read_write', 'no_formal_prerequisites'])
@pytest.mark.parametrize('value', [1, 'true', False, None])
def test_explicit_entry_conditions_reject_ambiguous_values(field, value):
    with pytest.raises(ValueError):
        validate_rules([{'id':'x','summary':'Test','all':[{'field':field,'operator':'eq','value':value}]}])


def test_literacy_unknown_is_not_assumed_and_open_entry_cannot_be_injected():
    routes = [{'id':'x','summary':'Literacy required','all':[{'field':'can_read_write','operator':'eq','value':True}]}]
    assert evaluate_eligibility({}, routes)['status'] == 'NEEDS_VERIFICATION'
    assert evaluate_eligibility({'can_read_write': 1}, routes)['status'] == 'NEEDS_VERIFICATION'
    assert evaluate_eligibility({'can_read_write': False}, routes)['status'] == 'NOT_ELIGIBLE'
    with pytest.raises(ValidationError):
        QualificationEligibilityFacts(no_formal_prerequisites=True)
    with pytest.raises(ValidationError):
        QualificationEligibilityFacts(can_read_write='true')
