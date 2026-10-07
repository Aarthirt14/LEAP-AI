import csv
import json
from abc import ABC, abstractmethod
from datetime import date
from urllib.parse import urlparse
from pathlib import Path
from typing import Any


class BaseAdapter(ABC):
    @abstractmethod
    def normalize(self, record: dict[str, Any]) -> dict[str, Any]: ...

    def validate(self, record: dict[str, Any]) -> None:
        """Validate structure, never certify source truth or current availability."""

    def load(self, path: str | Path) -> list[dict[str, Any]]:
        file = Path(path)
        if file.suffix.lower() == ".json":
            data = json.loads(file.read_text(encoding="utf-8"))
            records = data if isinstance(data, list) else data.get("records") if isinstance(data, dict) else None
            if not isinstance(records, list):
                raise ValueError("JSON must contain a list of records")
            return records
        if file.suffix.lower() == ".csv":
            with file.open(encoding="utf-8-sig", newline="") as handle:
                return list(csv.DictReader(handle))
        raise ValueError("Only CSV and JSON ingestion are supported")


class NQRAdapter(BaseAdapter):
    def normalize(self, record: dict[str, Any]) -> dict[str, Any]:
        return {"qualification_code": str(record.get("qualification_code") or "").strip().upper(), "qualification_name": str(record.get("qualification_name") or "").strip(), "sector": str(record.get("sector", "Unknown")).strip(), "occupational_role": str(record.get("occupational_role") or record.get("qualification_name", "")).strip(), "validity_status": str(record.get("validity_status", "UNKNOWN")).strip().upper(), "source_type": "NQR", **{k: v for k, v in record.items() if k not in {"qualification_code", "qualification_name", "sector", "occupational_role", "validity_status", "source_type"}}}


    def validate(self, record: dict[str, Any]) -> None:
        if not record.get("qualification_code") or not record.get("qualification_name"):
            raise ValueError("Qualification code and name are required")
        source = urlparse(str(record.get("source_url", "")))
        if source.scheme != "https" or source.hostname not in {"nqr.gov.in", "www.nqr.gov.in"} or source.username or source.password:
            raise ValueError("An HTTPS NQR source_url is required; a URL alone does not verify a record")
        try:
            level = float(record.get("nsqf_level", ""))
            if not 1 <= level <= 10:
                raise ValueError()
        except (ValueError, TypeError):
            raise ValueError("A numeric NSQF level between 1 and 10 is required") from None
        start, end = _dates(record, "valid_from", "valid_until")
        if not start or not end:
            raise ValueError("Both qualification validity dates are required")


class PMAJAYAdapter(BaseAdapter):
    def normalize(self, record: dict[str, Any]) -> dict[str, Any]:
        return {**record, "source_type": "PM_AJAY"}


class TrainingAdapter(BaseAdapter):
    def normalize(self, record: dict[str, Any]) -> dict[str, Any]:
        return {**record, "provider_name": str(record.get("provider_name") or "").strip(), "district": str(record.get("district") or "").strip(), "verification_status": str(record.get("verification_status", "UNVERIFIED")).upper()}


    def validate(self, record: dict[str, Any]) -> None:
        if not record.get("provider_name") or not record.get("district"):
            raise ValueError("Provider and district are required")
        if record.get("verification_status") == "VERIFIED":
            if str(record.get("source_type", "")).upper() == "SYNTHETIC":
                raise ValueError("Synthetic availability cannot be marked verified")
            if not record.get("source_reference"):
                raise ValueError("Verified availability requires a source_reference")
            checked, expires = _dates(record, "verified_on", "valid_until")
            if not checked or not expires or checked > date.today():
                raise ValueError("Verified availability requires a past/present verified_on and expiry")


def _dates(record: dict, start_key: str, end_key: str):
    try:
        start = date.fromisoformat(str(record[start_key])) if record.get(start_key) else None
        end = date.fromisoformat(str(record[end_key])) if record.get(end_key) else None
    except (ValueError, TypeError):
        raise ValueError("Dates must use YYYY-MM-DD") from None
    if start and end and start > end:
        raise ValueError("Start date must not be after expiry")
    return start, end


def ingest(adapter: BaseAdapter, path: str | Path, unique_key: str) -> tuple[list[dict], dict]:
    """Return only structurally valid, unexpired records plus a row-level rejection report.

    This is a review/import boundary, not an official-source verification service.
    No database writes, remote downloads or verification upgrades occur here.
    """
    raw = adapter.load(path)
    accepted: list[dict] = []
    seen: set[str] = set()
    report = {"total_records": len(raw), "valid": 0, "expired": 0,
              "not_yet_valid": 0, "invalid": 0, "duplicate": 0, "errors": []}
    for number, item in enumerate(raw, start=1):
        try:
            if not isinstance(item, dict):
                raise ValueError("Each record must be an object")
            normalized = adapter.normalize(item)
            key = str(normalized.get(unique_key) or "").strip().casefold()
            if not key:
                raise ValueError(f"Missing unique key: {unique_key}")
            adapter.validate(normalized)
            start, end = _dates(normalized, "valid_from", "valid_until")
            if normalized.get("validity_status") == "INVALID":
                raise ValueError("Record is marked INVALID")
        except (ValueError, TypeError) as error:
            report["invalid"] += 1
            report["errors"].append({"record": number, "reason": str(error)})
            continue
        if key in seen:
            report["duplicate"] += 1
            report["errors"].append({"record": number, "reason": "Duplicate unique key"})
            continue
        if normalized.get("validity_status") == "EXPIRED" or normalized.get("verification_status") == "EXPIRED" or (end and end < date.today()):
            report["expired"] += 1
            continue
        if start and start > date.today():
            report["not_yet_valid"] += 1
            continue
        seen.add(key)
        report["valid"] += 1
        accepted.append(normalized)
    return accepted, report
