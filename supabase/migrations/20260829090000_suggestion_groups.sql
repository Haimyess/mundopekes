-- Multi-activity suggestions: one wizard submission can now propose N
-- activities for a single place (existing or new) in one coherent action.
--
-- Design (see the wizard/audit conversation, 2026-08-29): `suggestions` stays
-- one row per activity — this keeps approve/merge working per-row exactly as
-- before. Rows submitted together share `suggestion_group_id`. For a
-- `new_place_with_experience` group, exactly one sibling is `is_primary`
-- (carries the place's name_i18n/description_i18n/location/place metadata);
-- the others have empty name_i18n/location, same convention already used for
-- `experience_for_existing_place` rows. Admin approval creates the place once
-- from the primary, then loops one activity insert per sibling.
--
-- For `experience_for_existing_place` groups every row already carries the
-- real `place_id` independently, so `is_primary` is not load-bearing there —
-- it just defaults to true and is ignored by approval logic for that type.

alter table suggestions
  add column if not exists suggestion_group_id uuid null,
  add column if not exists is_primary boolean not null default true;

create index if not exists suggestions_group_id_idx
  on suggestions (suggestion_group_id)
  where suggestion_group_id is not null;

comment on column suggestions.suggestion_group_id is
  'Groups sibling suggestion rows submitted together as "1 place + N activities". Null for single-activity submissions.';
comment on column suggestions.is_primary is
  'For a new_place_with_experience group, the one row carrying the place fields (name_i18n/location/metadata). Irrelevant for experience_for_existing_place.';
