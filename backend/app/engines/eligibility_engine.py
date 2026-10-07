"""Three-valued eligibility: AND within a route, OR between alternative routes.

A matching route is only a pre-screen against supplied facts, never admission approval.
Uncollected certificate/qualification/relevant-experience facts remain unknown.
"""
import math
import re

NUMERIC_FIELDS = {'completed_school_grade', 'relevant_experience_years', 'previous_nsqf_level'}


def school_grade(value):
    if not isinstance(value, str):
        return None
    match = re.fullmatch(r'\s*(?:class\s*)?(\d{1,2})(?:st|nd|rd|th)?(?:\s+(?:standard|passed|pass))?\s*', value, re.I)
    grade = int(match.group(1)) if match else None
    return grade if grade is not None and 1 <= grade <= 12 else None


def validate_rules(routes):
    if not isinstance(routes, list) or not routes:
        raise ValueError('At least one eligibility route is required')
    identities = set()
    for route in routes:
        if not isinstance(route, dict) or not isinstance(route.get('id'), str) or not route['id'] or route['id'] in identities:
            raise ValueError('Eligibility routes need unique IDs')
        identities.add(route['id'])
        if not isinstance(route.get('summary'), str) or not route['summary'].strip():
            raise ValueError('Eligibility route summary is required')
        conditions = route.get('all')
        if not isinstance(conditions, list) or not conditions:
            raise ValueError('Empty eligibility routes cannot grant eligibility')
        for condition in conditions:
            if not isinstance(condition, dict) or set(condition) != {'field', 'operator', 'value'}:
                raise ValueError('Invalid eligibility condition')
            field, operator, value = (condition[k] for k in ('field', 'operator', 'value'))
            if field in NUMERIC_FIELDS:
                if operator not in {'gte', 'eq'} or isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value) or value < 0:
                    raise ValueError('Invalid numeric eligibility condition')
            elif field == 'certificates':
                if operator != 'any' or not isinstance(value, list) or not value or any(not isinstance(v, str) or not v for v in value):
                    raise ValueError('Invalid certificate condition')
            else:
                raise ValueError('Unknown eligibility field')


def evaluate_eligibility(profile, routes):
    try:
        validate_rules(routes)
    except (ValueError, TypeError):
        return {'status': 'NEEDS_VERIFICATION', 'routes': [], 'reason': 'Eligibility rules require source review'}
    facts = dict(profile)
    if facts.get('completed_school_grade') is None:
        facts['completed_school_grade'] = school_grade(profile.get('education_level'))
    results = []
    for route in routes:
        states, missing = [], []
        for condition in route['all']:
            field, operator, required = (condition[k] for k in ('field', 'operator', 'value'))
            actual = facts.get(field)
            if field in NUMERIC_FIELDS:
                valid = not isinstance(actual, bool) and isinstance(actual, (int, float)) and math.isfinite(actual) and actual >= 0
                result = None if not valid else actual >= required if operator == 'gte' else actual == required
            else:
                valid = isinstance(actual, list) and all(isinstance(v, str) for v in actual)
                result = None if not valid else any(v.casefold() in {a.casefold() for a in actual} for v in required)
            states.append(result)
            if result is None:
                missing.append(field)
        status = 'NOT_MET' if False in states else 'NEEDS_VERIFICATION' if None in states else 'MET'
        results.append({'id': route['id'], 'summary': route['summary'], 'status': status, 'missing_facts': missing})
    status = 'ELIGIBLE_ON_REPORTED_FACTS' if any(r['status'] == 'MET' for r in results) else 'NEEDS_VERIFICATION' if any(r['status'] == 'NEEDS_VERIFICATION' for r in results) else 'NOT_ELIGIBLE'
    return {'status': status, 'routes': results}
