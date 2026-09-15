import csv
import json
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any


class BaseAdapter(ABC):
    @abstractmethod
    def normalize(self, record: dict[str, Any]) -> dict[str, Any]: ...

    def load(self, path: str | Path) -> list[dict[str, Any]]:
        file = Path(path)
        if file.suffix.lower() == ".json":
            data = json.loads(file.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else data.get("records", [])
        if file.suffix.lower() == ".csv":
            with file.open(encoding="utf-8-sig", newline="") as handle:
                return list(csv.DictReader(handle))
        raise ValueError("Only CSV and JSON ingestion are supported")


class NQRAdapter(BaseAdapter):
    def normalize(self, record: dict[str, Any]) -> dict[str, Any]:
        return {"qualification_code": str(record.get("qualification_code", "")).strip().upper(), "qualification_name": str(record.get("qualification_name", "")).strip(), "sector": str(record.get("sector", "Unknown")).strip(), "occupational_role": str(record.get("occupational_role") or record.get("qualification_name", "")).strip(), "validity_status": str(record.get("validity_status", "UNKNOWN")).strip().upper(), "source_type": "NQR", **{k: v for k, v in record.items() if k not in {"qualification_code", "qualification_name", "sector", "occupational_role", "validity_status", "source_type"}}}


class PMAJAYAdapter(BaseAdapter):
    def normalize(self, record: dict[str, Any]) -> dict[str, Any]:
        return {**record, "source_type": "PM_AJAY"}


class TrainingAdapter(BaseAdapter):
    def normalize(self, record: dict[str, Any]) -> dict[str, Any]:
        return {**record, "provider_name": str(record.get("provider_name", "")).strip(), "district": str(record.get("district", "")).strip(), "verification_status": str(record.get("verification_status", "UNVERIFIED")).upper()}


def ingest(adapter: BaseAdapter, path: str | Path, unique_key: str) -> tuple[list[dict], dict]:
    raw = adapter.load(path); valid: list[dict] = []; seen: set[str] = set(); report = {"total_records": len(raw), "valid": 0, "expired": 0, "invalid": 0, "duplicate": 0}
    for item in raw:
        normalized = adapter.normalize(item); key = str(normalized.get(unique_key, "")).lower()
        if not key:
            report["invalid"] += 1; continue
        if key in seen:
            report["duplicate"] += 1; continue
        seen.add(key)
        if normalized.get("validity_status") == "EXPIRED" or normalized.get("verification_status") == "EXPIRED":
            report["expired"] += 1
        else:
            report["valid"] += 1
        valid.append(normalized)
    return valid, report
