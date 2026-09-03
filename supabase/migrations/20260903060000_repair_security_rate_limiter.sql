-- Avoid the SQL-standard CURRENT_TIME keyword collision inside the production
-- rate limiter. Using an unambiguous variable keeps every comparison in
-- timestamptz and preserves fail-closed authentication safely.
create or replace function public.consume_security_rate_limit(
  p_scope text,
  p_identifier_hash text,
  p_max_attempts integer,
  p_window_seconds integer,
  p_block_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  current_state private.security_rate_limits%rowtype;
begin
  if char_length(p_scope) not between 3 and 80
    or p_identifier_hash !~ '^[a-f0-9]{64}$'
    or p_max_attempts not between 1 and 1000
    or p_window_seconds not between 1 and 86400
    or p_block_seconds not between 1 and 604800 then
    raise exception 'Invalid rate limit parameters';
  end if;

  insert into private.security_rate_limits (scope, identifier_hash)
  values (p_scope, p_identifier_hash)
  on conflict (scope, identifier_hash) do nothing;

  select * into current_state
  from private.security_rate_limits
  where scope = p_scope and identifier_hash = p_identifier_hash
  for update;

  if current_state.blocked_until is not null and current_state.blocked_until > v_now then
    return query select false, greatest(1, ceil(extract(epoch from (current_state.blocked_until - v_now)))::integer);
    return;
  end if;

  if current_state.window_started_at <= v_now - make_interval(secs => p_window_seconds) then
    update private.security_rate_limits
    set attempts = 0, window_started_at = v_now, blocked_until = null, updated_at = v_now
    where scope = p_scope and identifier_hash = p_identifier_hash;
    current_state.attempts := 0;
  end if;

  if current_state.attempts >= p_max_attempts then
    update private.security_rate_limits
    set blocked_until = v_now + make_interval(secs => p_block_seconds), updated_at = v_now
    where scope = p_scope and identifier_hash = p_identifier_hash;
    return query select false, p_block_seconds;
    return;
  end if;

  update private.security_rate_limits
  set attempts = attempts + 1, updated_at = v_now
  where scope = p_scope and identifier_hash = p_identifier_hash;
  return query select true, 0;
end;
$$;

revoke all on function public.consume_security_rate_limit(text, text, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_security_rate_limit(text, text, integer, integer, integer)
  to service_role;
