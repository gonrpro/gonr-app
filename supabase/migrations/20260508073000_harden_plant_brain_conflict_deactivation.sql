-- Harden Plant Brain conflict-flag emergency deactivation.
-- Source: TASK-150 SB third-pass + Atlas patch, 2026-05-08.
-- Purpose: ensure conflict_flags can fail closed for already promoted/promoted-central rows
-- instead of bouncing against constraints that require runtime_eligible=true for central guidance.

begin;

alter table public.plant_brain_promotion_log
  drop constraint if exists plant_brain_promotion_log_change_type_check;

alter table public.plant_brain_promotion_log
  add constraint plant_brain_promotion_log_change_type_check check (change_type in (
    'authority_class',
    'risk_tier',
    'review_status',
    'promotion_status',
    'feed_mode',
    'source_evidence',
    'runtime_eligibility',
    'conflict_flags',
    'safety_label'
  ));

create or replace function public.apply_plant_brain_item_change(
  p_item_id uuid,
  p_plant_id uuid,
  p_change_type text,
  p_to_value jsonb,
  p_reason text,
  p_source_basis jsonb,
  p_safety_label text,
  p_decided_by text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.plant_brain_items%rowtype;
  v_from_value jsonb;
begin
  if p_decided_by is null or btrim(p_decided_by) = '' then
    raise exception 'apply_plant_brain_item_change: decided_by required (no anonymous changes)';
  end if;

  select * into v_item
  from public.plant_brain_items
  where id = p_item_id and plant_id = p_plant_id
  for update;

  if not found then
    raise exception 'apply_plant_brain_item_change: item % not found in plant %', p_item_id, p_plant_id;
  end if;

  if auth.role() = 'authenticated'
    and lower(p_decided_by) != lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'apply_plant_brain_item_change: decided_by must match authenticated caller';
  end if;

  if not exists (
    select 1 from public.plant_users
    where plant_id = p_plant_id
      and user_email = lower(p_decided_by)
      and role in ('owner', 'operator')
  ) then
    raise exception 'apply_plant_brain_item_change: % is not owner/operator of plant %', p_decided_by, p_plant_id;
  end if;

  case p_change_type
    when 'authority_class' then v_from_value := to_jsonb(v_item.authority_class);
    when 'risk_tier' then v_from_value := to_jsonb(v_item.risk_tier);
    when 'review_status' then v_from_value := to_jsonb(v_item.review_status);
    when 'promotion_status' then v_from_value := to_jsonb(v_item.promotion_status);
    when 'feed_mode' then v_from_value := to_jsonb(v_item.feed_mode);
    when 'source_evidence' then v_from_value := v_item.source_evidence;
    when 'runtime_eligibility' then v_from_value := to_jsonb(v_item.runtime_eligible);
    when 'conflict_flags' then v_from_value := v_item.conflict_flags;
    when 'safety_label' then v_from_value := to_jsonb(v_item.safety_label);
    else raise exception 'apply_plant_brain_item_change: unknown change_type %', p_change_type;
  end case;

  case p_change_type
    when 'authority_class' then
      update public.plant_brain_items set authority_class = p_to_value #>> '{}', reviewer_email = p_decided_by, reviewed_at = now() where id = p_item_id and plant_id = p_plant_id;
    when 'risk_tier' then
      update public.plant_brain_items set risk_tier = p_to_value #>> '{}' where id = p_item_id and plant_id = p_plant_id;
    when 'review_status' then
      update public.plant_brain_items set review_status = p_to_value #>> '{}', reviewer_email = p_decided_by, reviewed_at = now() where id = p_item_id and plant_id = p_plant_id;
    when 'promotion_status' then
      update public.plant_brain_items set promotion_status = p_to_value #>> '{}' where id = p_item_id and plant_id = p_plant_id;
    when 'feed_mode' then
      update public.plant_brain_items set feed_mode = p_to_value #>> '{}' where id = p_item_id and plant_id = p_plant_id;
    when 'source_evidence' then
      update public.plant_brain_items set source_evidence = p_to_value where id = p_item_id and plant_id = p_plant_id;
    when 'runtime_eligibility' then
      update public.plant_brain_items set runtime_eligible = (p_to_value #>> '{}')::boolean where id = p_item_id and plant_id = p_plant_id;
    when 'conflict_flags' then
      update public.plant_brain_items
      set conflict_flags = p_to_value,
          runtime_eligible = false,
          promotion_status = case when promotion_status = 'promoted' then 'demoted' else promotion_status end,
          feed_mode = case when feed_mode = 'promoted-central' then 'review-candidate' else feed_mode end
      where id = p_item_id and plant_id = p_plant_id;
    when 'safety_label' then
      update public.plant_brain_items set safety_label = p_to_value #>> '{}' where id = p_item_id and plant_id = p_plant_id;
  end case;

  insert into public.plant_brain_promotion_log (
    plant_brain_item_id, plant_id, change_type, from_value, to_value,
    decided_by, reason, source_basis, safety_label, metadata
  ) values (
    p_item_id, p_plant_id, p_change_type, v_from_value, p_to_value,
    p_decided_by, p_reason, p_source_basis, p_safety_label, p_metadata
  );

  if p_change_type = 'conflict_flags' and (p_to_value::text not in ('null', 'false', '{}', '[]')) then
    if v_item.runtime_eligible = true then
      insert into public.plant_brain_promotion_log (
        plant_brain_item_id, plant_id, change_type, from_value, to_value,
        decided_by, reason, source_basis, safety_label, metadata
      ) values (
        p_item_id, p_plant_id, 'runtime_eligibility',
        to_jsonb(true), to_jsonb(false),
        p_decided_by,
        coalesce(p_reason, '') || ' [auto: conflict_flags addition forced runtime_eligible=false]',
        p_source_basis, p_safety_label,
        jsonb_build_object('triggered_by', 'conflict_flags_change')
      );
    end if;

    if v_item.promotion_status = 'promoted' then
      insert into public.plant_brain_promotion_log (
        plant_brain_item_id, plant_id, change_type, from_value, to_value,
        decided_by, reason, source_basis, safety_label, metadata
      ) values (
        p_item_id, p_plant_id, 'promotion_status',
        to_jsonb('promoted'::text), to_jsonb('demoted'::text),
        p_decided_by,
        coalesce(p_reason, '') || ' [auto: conflict_flags addition forced promotion_status=demoted]',
        p_source_basis, p_safety_label,
        jsonb_build_object('triggered_by', 'conflict_flags_change')
      );
    end if;

    if v_item.feed_mode = 'promoted-central' then
      insert into public.plant_brain_promotion_log (
        plant_brain_item_id, plant_id, change_type, from_value, to_value,
        decided_by, reason, source_basis, safety_label, metadata
      ) values (
        p_item_id, p_plant_id, 'feed_mode',
        to_jsonb('promoted-central'::text), to_jsonb('review-candidate'::text),
        p_decided_by,
        coalesce(p_reason, '') || ' [auto: conflict_flags addition removed promoted-central feed_mode]',
        p_source_basis, p_safety_label,
        jsonb_build_object('triggered_by', 'conflict_flags_change')
      );
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'item_id', p_item_id,
    'change_type', p_change_type,
    'from_value', v_from_value,
    'to_value', p_to_value,
    'decided_by', p_decided_by,
    'decided_at', now()
  );
end;
$$;

revoke all on function public.apply_plant_brain_item_change(
  uuid, uuid, text, jsonb, text, jsonb, text, text, jsonb
) from public;
grant execute on function public.apply_plant_brain_item_change(
  uuid, uuid, text, jsonb, text, jsonb, text, text, jsonb
) to authenticated, service_role;

commit;
