"""Deterministic preview. Raw transcripts remain untouched; confirmation is not verification."""
import hashlib
import json
import re
import unicodedata
from app.services.profile_service import PROFILE_FIELDS


def parse_value(key: str, text: str):
    text = unicodedata.normalize("NFKC", text).strip()
    if key in {"mobility_km", "capital_available", "experience_years"}:
        numeric = "".join(str(unicodedata.digit(c)) if c.isdecimal() else c for c in text)
        # Accept one explicit non-negative value with a supported unit, never guess ranges or number words.
        match = re.fullmatch(r"(?:₹\s*)?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:km|kilometres?|kilometers?|years?|rs\.?|rupees?|கி\.மீ\.?|கிமீ|ஆண்டுகள்|வருடங்கள்|ரூபாய்|किमी|साल|वर्ष|रुपये)?", numeric, re.I)
        return (float(match.group(1).replace(",", "")), None) if match else (None, "Needs confirmation: enter one number with its unit.")
    if key == "relocation_willingness":
        value = text.casefold()
        if value in {"yes", "true", "willing", "ஆம்", "हाँ"}: return True, None
        if value in {"no", "false", "இல்லை", "नहीं"}: return False, None
        return None, "Needs confirmation: choose yes or no."
    if key in {"available_hours_start", "available_hours_end"}:
        if re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", text): return text, None
        return None, "Needs confirmation: use 24-hour HH:MM."
    if key not in PROFILE_FIELDS: return text, "Kept as interview evidence; not a profile field."
    return text or None, None if text else "Not provided"


def preview(session):
    rows = []
    for answer in session.answers:
        text = answer.corrected_text if answer.corrected_text is not None else answer.transcript
        value, warning = parse_value(answer.question_key, text)
        rows.append({"id": answer.id, "key": answer.question_key, "question": answer.question_text, "transcript": answer.transcript, "text": text, "value": value, "warning": warning})
    token = hashlib.sha256(json.dumps(rows, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
    return {"answers": rows, "preview_token": token, "verification": "SELF_REPORTED"}
