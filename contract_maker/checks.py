"""Deterministic validation and values calculated from entered details."""
from datetime import date
from .fields import validate, weekday, salary_words, salary_amount, arabic_name_key
from .templates import validate_template


def check_fields(fields, entry, rules, confirmed=False):
    findings = validate(fields, require_confirmation=confirmed)
    findings.extend(validate_template(fields, entry, require_confirmation=confirmed))
    name = arabic_name_key(fields.get('name_ar', {}).get('value', ''))
    for instruction in rules.get('job_title_overrides', []):
        if name and name == arabic_name_key(instruction.get('name_ar', '')):
            for key in ['job_title_ar', 'job_title_en']:
                expected = instruction.get(key)
                if expected and fields.get(key, {}).get('value', '').strip() != expected.strip():
                    findings.append({'level': 'error', 'field': key, 'message': 'Your saved instruction for this employee requires: ' + expected})
    unique = {}
    for finding in findings:
        unique[(finding['level'], finding['field'], finding['message'])] = finding
    return list(unique.values())


def calculations(fields):
    values = {k: str(v.get('value', '')).strip() for k, v in fields.items()}
    result = {}
    try:
        result['weekday_ar'] = weekday(values['execution_date'], 'ar')
        result['weekday_en'] = weekday(values['execution_date'], 'en')
    except (ValueError, KeyError):
        pass
    try:
        start, end = date.fromisoformat(values['start_date']), date.fromisoformat(values['end_date'])
        if start <= end:
            result['calendar_days'] = (end - start).days + 1
    except (ValueError, KeyError):
        pass
    try:
        result['salary_usd'] = format(salary_amount(values['salary_usd']), 'f')
        result['salary_words_ar'] = salary_words(values['salary_usd'], 'ar')
        result['salary_words_en'] = salary_words(values['salary_usd'], 'en')
    except (ValueError, KeyError):
        pass
    return result
