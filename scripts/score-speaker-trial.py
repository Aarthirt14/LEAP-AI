"""Score consented, human-transcribed JSONL trials. Never writes transcripts.

python scripts/score-speaker-trial.py PRIVATE_TRIAL.jsonl --output PRIVATE_REPORT.json
See docs/PILOT_EVALUATION.md for the input contract and collection protocol.
"""
import argparse
from collections import defaultdict
import json
from pathlib import Path
import unicodedata


def normalize(text):
    return ' '.join(unicodedata.normalize('NFC', text).casefold().split())


def distance(a, b):
    row = list(range(len(b) + 1))
    for i, left in enumerate(a, 1):
        following = [i]
        for j, right in enumerate(b, 1):
            following.append(min(following[-1] + 1, row[j] + 1, row[j-1] + (left != right)))
        row = following
    return row[-1]


def score(records):
    groups = defaultdict(lambda: {'clips': 0, 'speakers': set(), 'word_edits': 0, 'words': 0,
        'character_edits': 0, 'characters': 0, 'correct_slots': 0, 'slots': 0})
    seen = set()
    for item in records:
        for field in ('language', 'speaker_id', 'clip_id', 'consent_id', 'reference_transcript'):
            if not isinstance(item.get(field), str) or not item[field].strip():
                raise ValueError(f'Missing {field}; only consented, reviewed recordings can be scored')
        if not isinstance(item.get('recognized_transcript'), str):
            raise ValueError('Recognized transcript must be text; an empty transcript counts as a failure')
        if item['language'] == 'ALL':
            raise ValueError('ALL is reserved for aggregate results')
        if item['clip_id'] in seen:
            raise ValueError('Duplicate clip ID')
        seen.add(item['clip_id'])
        expected, actual = item.get('expected_profile'), item.get('actual_profile')
        if not isinstance(expected, dict) or not expected or not isinstance(actual, dict):
            raise ValueError('Expected and actual profiles are required, with at least one labelled slot')
        reference, hypothesis = normalize(item['reference_transcript']), normalize(item['recognized_transcript'])
        if not reference:
            raise ValueError('Reference transcript is empty after normalization')
        for key in ('ALL', item['language']):
            group = groups[key]
            group['clips'] += 1
            group['speakers'].add(item['speaker_id'])
            group['word_edits'] += distance(reference.split(), hypothesis.split())
            group['words'] += len(reference.split())
            group['character_edits'] += distance(reference, hypothesis)
            group['characters'] += len(reference)
            group['slots'] += len(expected)
            group['correct_slots'] += sum(k in actual and json.dumps(actual[k], sort_keys=True) == json.dumps(v, sort_keys=True) for k, v in expected.items())
    output = {}
    for language, group in groups.items():
        output[language] = {**group, 'speakers': len(group['speakers']),
            'word_error_rate': round(group['word_edits'] / group['words'], 4),
            'character_error_rate': round(group['character_edits'] / group['characters'], 4),
            'profile_slot_accuracy': round(group['correct_slots'] / group['slots'], 4)}
    return {'status': 'SCORED' if records else 'NOT_RUN', 'by_language': output,
        'method': 'NFC, casefold, whitespace normalization; micro-averaged word/character edit rates; exact labelled profile-slot accuracy. Punctuation retained. These metrics do not establish recommendation quality.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    rows = [json.loads(line) for line in args.input.read_text().splitlines() if line.strip()]
    report = score(rows)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    print(f"{report['status']}: {len(rows)} clips. Report excludes transcripts and participant IDs.")
