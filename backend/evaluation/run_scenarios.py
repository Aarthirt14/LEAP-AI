"""Run authored synthetic scenarios, not a human trial or competitor benchmark.

From backend: python -m evaluation.run_scenarios --output ../docs/evaluation-results.json
"""
import argparse
from copy import deepcopy
from datetime import date
import hashlib
import json
from pathlib import Path
from app.engines.eligibility_engine import evaluate_eligibility
from app.engines.pathway_engine import rank_pathways

ROOT = Path(__file__).resolve().parents[2]


def evaluate():
    raw = (ROOT / 'data/nqr-reference.json').read_bytes()
    document = json.loads(raw)
    suite = json.loads((Path(__file__).parent / 'scenarios.json').read_text())
    rows = []
    for case in suite['cases']:
        records = deepcopy(document['records'])
        target = next(r for r in records if r['registry_id'] == case['registry_id'])
        for field in ('source_checked_on', 'valid_until'):
            if field in case:
                target[field] = case[field]
        qualifications = [dict(id=int(r['registry_id']), qualification_code=f"NQR:{r['registry_id']}",
            title=r['title'], sector=r['sector'], source_type='NQR', source_metadata=r,
            valid_until=r['valid_until'], validity_status='VALID', duration_hours=r['duration_hours_max'],
            competencies=[]) for r in records]
        profile = case['profile']
        facts = {'education_level': profile.get('education_level'), **profile.get('eligibility_facts', {}).get(f"NQR:{case['registry_id']}", {})}
        actual = evaluate_eligibility(facts, target['eligibility_rules'])['status']
        results = rank_pathways(profile, [], qualifications, {}, {}, as_of=date.fromisoformat(suite['as_of']))
        baseline = rank_pathways(profile, [], [q for q in qualifications if str(q['id']) in suite['baseline_registry_ids']], {}, {}, as_of=date.fromisoformat(suite['as_of']))
        present = any(str(r['qualification_id']) == case['registry_id'] for r in results)
        honest = all(not r['training_available'] and r['confidence'] == 'RED' for r in results)
        rows.append({'id': case['id'], 'expected_eligibility': case['expected'], 'actual_eligibility': actual,
            'expected_in_recommendations': case['ranked'], 'in_recommendations': present,
            'baseline_in_recommendations': any(str(r['qualification_id']) == case['registry_id'] for r in baseline),
            'no_unsupported_opportunity_or_confidence': honest,
            'passed': actual == case['expected'] and present == case['ranked'] and honest})
    return {'kind': 'AUTHORED_SYNTHETIC_SCENARIOS', 'as_of': suite['as_of'],
        'catalogue_sha256': hashlib.sha256(raw).hexdigest(), 'reviewed_qualifications': len(document['records']),
        'baseline': 'Same current engine, restricted to the previous two registry IDs; catalogue ablation, not a historical engine or Saksham evaluation.',
        'cases': len(rows), 'passed': sum(r['passed'] for r in rows),
        'human_speakers_tested': 0, 'verified_open_pilot_batches': 0, 'results': rows}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    report = evaluate()
    payload = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    if args.output:
        args.output.write_text(payload)
    print(f"{report['passed']}/{report['cases']} synthetic scenarios passed; human speakers: 0")
    raise SystemExit(0 if report['passed'] == report['cases'] else 1)


if __name__ == '__main__':
    main()
