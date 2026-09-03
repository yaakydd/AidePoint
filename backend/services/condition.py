"""
The single, canonical place condition ("anemic" / "healthy" / "unknown")
is decided from a prediction's underlying signals.

Every consumer of a prediction, the /predict response, the AideBot chat
context, and (if ever needed) a future web dashboard or export -- must
call resolve_condition() rather than re-deriving this decision itself.
Before this module existed, the decision was implemented three times
(routers/predict.py, the mobile app's ReportUtils.js, and implicitly
left to Gemini's own judgement in aidebot.py) and had drifted out of
sync in two different ways across those copies. Reusing one function
is what keeps that from happening again.
"""

# Keys in a morphology_findings dict (see
# services/prediction_helpers._build_morphology_findings) that are never
# themselves grounds for "unknown" -- normal_morphology being "flagged"
# means the model found nothing wrong, which is the opposite of a reason
# for uncertainty.
MORPHOLOGY_KEYS_EXCLUDED_FROM_UNKNOWN: frozenset[str] = frozenset({"normal_morphology"})


def has_flagged_morphology(morphology_findings: dict[str, dict] | None) -> bool:
    """
    morphology_findings: {flag_name: {"probability": float, "flagged": bool}, ...}
    as returned by _build_morphology_findings / stored in prediction_records.
    """
    if not morphology_findings:
        return False
    return any(
        finding.get("flagged") is True
        for flag_name, finding in morphology_findings.items()
        if flag_name not in MORPHOLOGY_KEYS_EXCLUDED_FROM_UNKNOWN
    )


def resolve_condition(
    is_anemic: bool,
    is_off_scope: bool,
    morphology_findings: dict[str, dict] | None = None,
) -> str:
    """
    Returns "anemic" | "healthy" | "unknown".

    Rule, in order:
      1. is_off_scope always wins -> "unknown", regardless of is_anemic.
         This is shape_screening_result.needs_review specifically -- a
         signal that the sample itself doesn't look like a normal RBC
         smear (e.g. sickle cells, malaria-distorted cells) -- NOT
         ordinary image-quality unreliability (blur/brightness/OOD/poor
         staining), which is surfaced separately via is_unreliable /
         unreliable_reasons as a caveat, not a condition override.

         NOTE: needs_review is a generic "too many non-round cells"
         signal (flagged_fraction > 0.25 in shape_screening.py), not a
         malaria/sickle-cell-specific classifier. It's a proxy for
         off-scope samples, not ground truth -- a genuinely on-scope
         sample with heavy artifactual cell distortion (e.g. bad smear
         technique) can also trip it and get benched to "unknown" even
         though it isn't truly off-scope.
      2. Otherwise, is_anemic decides "anemic" vs a provisional "healthy".
      3. A provisional "healthy" is downgraded to "unknown" if a
         non-anemia morphology flag fired (e.g. target cells,
         elliptocytosis) -- the read wasn't flagged as anemic, but
         something else was still found that a clean "healthy" shouldn't
         paper over.
    """
    if is_off_scope:
        return "unknown"
    if is_anemic:
        return "anemic"
    if has_flagged_morphology(morphology_findings):
        return "unknown"
    return "healthy"