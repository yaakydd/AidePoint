-- Defines prediction_records, the permanent audit trail for every /predict
-- call. Column set is derived directly from audit_trail.py's
-- PredictionRecord dataclass, since that dataclass is the actual source
-- of truth for what a prediction record contains -- this file exists to
-- give Postgres a matching table, not the other way around.

create table if not exists prediction_records (
    prediction_id uuid primary key default gen_random_uuid(),

    -- Who and what was scanned. patient_sample_id is free text entered by
    -- the lab technician at upload time, not a foreign key into a
    -- separate patient table -- there is no patient registration flow yet.
    patient_sample_id text not null,
    technician_id uuid not null references auth.users(id),

    -- Content hashes tie this record back to the exact bytes analyzed,
    -- independent of filename or upload timestamp. original_image_hash
    -- covers the image as uploaded; analyzed_image_hash covers it after
    -- auto_crop_microscope_field, since those can differ.
    original_image_hash text not null,
    analyzed_image_hash text not null,
    was_cropped boolean not null,

    -- Model provenance. A prediction made in six months, after a
    -- retrain, needs to be traceable to the exact model and threshold
    -- that produced it -- "the model" is not a stable reference point
    -- on its own.
    model_name text not null,
    model_version text not null,
    decision_threshold double precision not null,

    -- Pre-inference image quality gate result.
    image_quality_score text not null,
    image_quality_breakdown jsonb not null,

    -- Core prediction outputs.
    anemia_probability double precision not null,
    is_anemic boolean not null,
    prediction_confidence text not null,

    -- Reliability gate outputs (quality_checks.py + shape_screening.py).
    is_unreliable boolean not null,
    unreliable_reasons jsonb not null default '[]'::jsonb,

    -- morphology_findings shape: {flag_name: {"probability": float,
    -- "flagged": bool}} for all 9 flags, not just the ones above the
    -- 0.5 reporting threshold -- the full record should retain what the
    -- model actually output, even if the UI-facing explanation only
    -- surfaces the flagged subset.
    morphology_findings jsonb not null,

    -- cbc_pattern_summary shape: output of
    -- cbc_uncertainty.serialize_pattern_summary -- per-field direction,
    -- confidence, and display text, not raw regression values.
    cbc_pattern_summary jsonb not null,

    -- explanation shape: output of morphology_explanations.build_explanation.
    explanation jsonb not null,

    -- Human review workflow (human_review.py).
    required_human_review boolean not null,
    human_review_status text not null default 'not_required'
        check (human_review_status in ('not_required', 'pending', 'in_progress', 'completed')),

    created_at timestamptz not null default now()
);

-- A technician looking up their own scan history is the primary read
-- pattern -- this index makes that a lookup rather than a scan.
create index if not exists idx_prediction_records_technician
    on prediction_records (technician_id, created_at desc);

-- Records awaiting human review are queried as a worklist, separately
-- from any one technician's history.
create index if not exists idx_prediction_records_pending_review
    on prediction_records (created_at)
    where human_review_status = 'pending';

-- Row-level security: a technician can read their own prediction records.
-- Inserts happen exclusively through the backend's service-role key
-- (see persist_prediction_record in audit_trail.py), never directly from
-- the client, so there is no insert policy for the anon/authenticated role.
alter table prediction_records enable row level security;

create policy "Technicians can view their own prediction records"
    on prediction_records for select
    using (auth.uid() = technician_id);


-- Column set derived from human_review.py's ReviewSubmission model and
-- the review_row dict submit_review() builds. One review per prediction
-- -- enforced here with a unique constraint, not just the application-
-- level existing_review check in submit_review(), since two concurrent
-- submissions for the same prediction could otherwise both pass that
-- check before either insert completes.
create table if not exists prediction_reviews (
    review_id uuid primary key default gen_random_uuid(),
    prediction_id uuid not null unique references prediction_records(prediction_id),
    reviewing_technician_id uuid not null references auth.users(id),
    reviewed_at timestamptz not null,

    technician_decision text not null
        check (technician_decision in ('accepted', 'modified', 'flagged_for_review')),

    -- Null is a meaningful state here, not a missing value -- it means
    -- the technician escalated uncertainty rather than asserting the AI
    -- was right or wrong. See usable_for_retraining below.
    ai_was_correct boolean,

    observed_morphology jsonb not null default '[]'::jsonb,
    final_interpretation text not null,
    technician_notes text,

    -- True only when ai_was_correct is not null -- a flagged-for-review
    -- submission without a definite correctness call is audit-worthy but
    -- should not silently count as a labeled training example.
    usable_for_retraining boolean not null
);

create index if not exists idx_prediction_reviews_prediction
    on prediction_reviews (prediction_id);

alter table prediction_reviews enable row level security;

create policy "Technicians can view their own submitted reviews"
    on prediction_reviews for select
    using (auth.uid() = reviewing_technician_id);