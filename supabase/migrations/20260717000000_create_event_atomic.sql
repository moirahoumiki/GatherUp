create or replace function public.create_event_atomic(
  p_public_code text,
  p_name text,
  p_category event_category,
  p_template event_template,
  p_custom_type_label text,
  p_city text,
  p_venue_name text,
  p_address text,
  p_starts_at timestamptz,
  p_registration_deadline timestamptz,
  p_capacity integer,
  p_price_cents integer,
  p_description text,
  p_payment_instructions text,
  p_custom_form_config jsonb,
  p_payment_code_img text,
  p_wechat_group_img text,
  p_allow_multi_person_registration boolean,
  p_max_people_per_registration integer,
  p_order_number_prefix text,
  p_fee_mode event_fee_mode,
  p_settlement_rule text,
  p_payment_method text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_auth_user_id uuid;
  v_owner_id uuid;
  v_event_id uuid;
  v_public_code text;
  v_order_number_prefix text;
begin
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'Please sign in before creating an event.'
    );
  end if;

  select id
  into v_owner_id
  from public.users
  where auth_user_id = v_auth_user_id;

  if v_owner_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'PROFILE_NOT_FOUND',
      'message', 'The authenticated user does not have a GatherUp profile.'
    );
  end if;

  v_public_code := upper(trim(coalesce(p_public_code, '')));

  if v_public_code !~ '^GU-[A-Z0-9-]{3,28}$' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_PUBLIC_CODE',
      'message', 'The event public code is invalid.'
    );
  end if;

  if length(trim(coalesce(p_name, ''))) = 0 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_EVENT_NAME',
      'message', 'The event name is required.'
    );
  end if;

  if coalesce(p_capacity, 0) < 1 or coalesce(p_price_cents, -1) < 0 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_EVENT_LIMITS',
      'message', 'Capacity and price must be valid non-negative values.'
    );
  end if;

  if p_allow_multi_person_registration and coalesce(p_max_people_per_registration, 0) < 2 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_MULTI_PERSON_LIMIT',
      'message', 'Multi-person registration requires a limit of at least two.'
    );
  end if;

  if not p_allow_multi_person_registration and p_max_people_per_registration <> 1 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_MULTI_PERSON_LIMIT',
      'message', 'Single-person registration must have a limit of one.'
    );
  end if;

  v_order_number_prefix := coalesce(
    nullif(trim(p_order_number_prefix), ''),
    substring(v_public_code from 4 for 8)
  );

  insert into public.events (
    public_code,
    organizer_id,
    name,
    category,
    template,
    custom_type_label,
    city,
    venue_name,
    address,
    starts_at,
    registration_deadline,
    capacity,
    price_cents,
    description,
    payment_instructions,
    custom_form_config,
    payment_code_img,
    wechat_group_img,
    allow_multi_person_registration,
    max_people_per_registration,
    order_number_prefix,
    status
  ) values (
    v_public_code,
    v_owner_id,
    trim(p_name),
    p_category,
    p_template,
    nullif(trim(p_custom_type_label), ''),
    coalesce(nullif(trim(p_city), ''), 'TBD'),
    coalesce(nullif(trim(p_venue_name), ''), 'TBD'),
    nullif(trim(p_address), ''),
    p_starts_at,
    p_registration_deadline,
    p_capacity,
    p_price_cents,
    nullif(trim(p_description), ''),
    nullif(trim(p_payment_instructions), ''),
    coalesce(p_custom_form_config, '{}'::jsonb),
    nullif(trim(p_payment_code_img), ''),
    nullif(trim(p_wechat_group_img), ''),
    p_allow_multi_person_registration,
    p_max_people_per_registration,
    v_order_number_prefix,
    'draft'
  )
  returning id into v_event_id;

  insert into public.event_organizers (
    event_id,
    user_id,
    role,
    status,
    accepted_at
  ) values (
    v_event_id,
    v_owner_id,
    'owner',
    'active',
    now()
  );

  insert into public.event_finance_settings (
    event_id,
    fee_mode,
    revenue_source,
    settlement_rule
  ) values (
    v_event_id,
    p_fee_mode,
    case when p_price_cents > 0 then 'registration_orders' else 'none' end,
    nullif(trim(p_settlement_rule), '')
  );

  if nullif(trim(p_payment_code_img), '') is not null then
    insert into public.collection_code_versions (
      event_id,
      version_number,
      status,
      method,
      display_name,
      qr_file_url,
      instructions,
      uploaded_by,
      active_from
    ) values (
      v_event_id,
      1,
      'active',
      coalesce(nullif(trim(p_payment_method), ''), 'wechat'),
      'Organizer collection code',
      trim(p_payment_code_img),
      nullif(trim(p_payment_instructions), ''),
      v_owner_id,
      now()
    );
  end if;

  insert into public.audit_logs (
    actor_id,
    actor_role,
    event_id,
    target_type,
    target_id,
    action,
    risk_level,
    after_snapshot
  ) values (
    v_owner_id,
    'organizer',
    v_event_id,
    'event',
    v_event_id,
    'event.created',
    'low',
    jsonb_build_object(
      'public_code', v_public_code,
      'name', trim(p_name),
      'status', 'draft',
      'fee_mode', p_fee_mode
    )
  );

  return jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'public_code', v_public_code,
    'custom_form_config', coalesce(p_custom_form_config, '{}'::jsonb),
    'payment_code_img', nullif(trim(p_payment_code_img), '')
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'success', false,
      'error_code', 'PUBLIC_CODE_CONFLICT',
      'message', 'An event with this public code already exists.'
    );
  when check_violation or not_null_violation then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_EVENT_INPUT',
      'message', 'The event data violates a database constraint.'
    );
  when others then
    raise warning '[GatherUp] create_event_atomic: % | %', sqlstate, sqlerrm;
    return jsonb_build_object(
      'success', false,
      'error_code', 'INTERNAL_ERROR',
      'message', 'Event creation failed.'
    );
end;
$$;

revoke all on function public.create_event_atomic(
  text,
  text,
  event_category,
  event_template,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  integer,
  integer,
  text,
  text,
  jsonb,
  text,
  text,
  boolean,
  integer,
  text,
  event_fee_mode,
  text,
  text
) from public, anon;

grant execute on function public.create_event_atomic(
  text,
  text,
  event_category,
  event_template,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  integer,
  integer,
  text,
  text,
  jsonb,
  text,
  text,
  boolean,
  integer,
  text,
  event_fee_mode,
  text,
  text
) to authenticated;
