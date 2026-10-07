from pathlib import Path
import runpy
import pytest

score = runpy.run_path(str(Path(__file__).resolve().parents[2] / 'scripts/score-speaker-trial.py'))['score']


def clip():
    # Synthetic fixture to test the scorer only; not trial evidence.
    return dict(language='Tamil', speaker_id='fixture', clip_id='fixture', consent_id='fixture-only',
        reference_transcript='வணக்கம் உலகம்', recognized_transcript='',
        expected_profile={'education_level':None}, actual_profile={})


def test_empty_trial_is_not_a_success():
    assert score([])['status'] == 'NOT_RUN'


def test_failed_recognition_counts_and_report_omits_identifiers():
    result = score([clip()])['by_language']['ALL']
    assert result['word_error_rate'] == result['character_error_rate'] == 1
    assert result['profile_slot_accuracy'] == 0
    assert result['speakers'] == 1
    assert 'speaker_id' not in result


def test_perfect_transcription_and_explicit_unknown():
    row = clip()
    row['recognized_transcript'] = row['reference_transcript']
    row['actual_profile'] = {'education_level': None}
    result = score([row])['by_language']['Tamil']
    assert result['word_error_rate'] == result['character_error_rate'] == 0
    assert result['profile_slot_accuracy'] == 1
    with pytest.raises(ValueError):
        score([row, row])


def test_missing_consent_reference_rejected():
    row = clip()
    row['consent_id'] = ''
    with pytest.raises(ValueError):
        score([row])
