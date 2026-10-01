from datetime import date, datetime, timezone


def qualification_is_current(record: dict, today: date | None = None) -> bool:
    today = today or datetime.now(timezone.utc).date()
    if record.get("validity_status") in {"EXPIRED", "INVALID"}:
        return False
    def parse(value):
        if isinstance(value, datetime): return value.date()
        if isinstance(value, date): return value
        return date.fromisoformat(str(value))
    try:
        start = parse(record["valid_from"]) if record.get("valid_from") else None
        end = parse(record["valid_until"]) if record.get("valid_until") else None
        return not ((start and start > today) or (end and end < today) or (start and end and start > end))
    except (ValueError, TypeError):
        return False
