"""Size matching engine – computes fit scores between customer measurements and size chart."""

import math


# Weights for each measurement dimension (higher = more important for fit)
WEIGHTS = {
    "chest": 3.0,
    "shoulder": 2.5,
    "sleeve_length": 1.5,
    "body_length": 1.0,
    "waist": 2.0,
}


def _range_penalty(value: float, low: float, high: float, weight: float) -> float:
    """Return 0 if value is within [low, high], else a weighted squared distance."""
    if low <= value <= high:
        return 0.0
    diff = min(abs(value - low), abs(value - high))
    return weight * (diff ** 2)


def _point_penalty(value: float, target: float, weight: float) -> float:
    """Squared weighted difference from a single target value."""
    return weight * ((value - target) ** 2)


def compute_fit_score(
    chest: float,
    shoulder: float,
    sleeve_length: float,
    body_length: float,
    waist: float,
    size: dict,
) -> float:
    """
    Compute a fit score (0-100) for a customer against a size entry.
    100 = perfect fit, lower = worse fit.
    """
    total_penalty = 0.0
    total_penalty += _range_penalty(chest, size["chest_min"], size["chest_max"], WEIGHTS["chest"])
    total_penalty += _point_penalty(shoulder, size["shoulder"], WEIGHTS["shoulder"])
    total_penalty += _point_penalty(sleeve_length, size["sleeve_length"], WEIGHTS["sleeve_length"])
    total_penalty += _point_penalty(body_length, size["body_length"], WEIGHTS["body_length"])
    total_penalty += _range_penalty(waist, size["waist_min"], size["waist_max"], WEIGHTS["waist"])

    # Convert penalty to a 0-100 score using exponential decay
    score = 100 * math.exp(-total_penalty / 20)
    return round(score, 1)


def fit_label(score: float) -> str:
    if score >= 85:
        return "Excellent Fit"
    if score >= 70:
        return "Good Fit"
    if score >= 50:
        return "Acceptable Fit"
    return "Poor Fit"
