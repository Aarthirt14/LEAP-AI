from app.config import get_settings


def mismatch_signal(demand: int, capacity: int, outcome_rate: float) -> str:
    thresholds = get_settings().mismatch_thresholds
    if capacity == 0 and demand > 0:
        return "HIGH_DEMAND_LOW_CAPACITY"
    demand_ratio = demand / max(capacity, 1)
    capacity_ratio = capacity / max(demand, 1)
    if demand_ratio >= thresholds["high_demand_ratio"]:
        return "HIGH_DEMAND_LOW_CAPACITY"
    if capacity_ratio >= thresholds["oversupply_ratio"] and outcome_rate < thresholds["low_outcome_rate"]:
        return "HIGH_CAPACITY_LOW_OUTCOME"
    if capacity_ratio >= thresholds["oversupply_ratio"]:
        return "LOW_DEMAND_HIGH_CAPACITY"
    if abs(demand - capacity) / max(demand, capacity, 1) <= thresholds["balanced_ratio_delta"] and outcome_rate >= thresholds["low_outcome_rate"]:
        return "BALANCED"
    return "MONITOR"


def build_radar(rows: list[dict]) -> list[dict]:
    return [{**row, "signal": mismatch_signal(int(row["viable_beneficiary_demand"]), int(row["training_capacity"]), float(row["outcome_90_day_rate"]))} for row in rows]
