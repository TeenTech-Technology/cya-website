-- =========================================================
-- CYA: parent or guardian permission on seats and volunteers
-- Safe to run more than once. Paste the whole file into
-- Supabase > SQL Editor > Run.
--
-- Requires the dashboard file supabase/migration_002.sql
-- (events, reservations, volunteers, reserve_seat) first.
--
-- What this adds
--   reservations.under_18, parent_permission, parent_phone
--   volunteers.parent_permission, parent_phone
--   a second reserve_seat function that stores those fields
--
-- The original reserve_seat(uuid, text, text, text, int) is
-- left in place. The website calls the new function only when
-- the person is under 18. If this file has not been run, that
-- call does not match a function and the website books again
-- with the original five arguments, so existing booking still
-- works. Adult bookings always use the original function.
-- Once this file has been run, an adult row stores under_18
-- as false (the column default). An under-18 row stores the
-- tick and the parent or guardian phone number.
-- =========================================================

alter table public.reservations
  add column if not exists under_18 boolean not null default false,
  add column if not exists parent_permission boolean not null default false,
  add column if not exists parent_phone text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'reservations_parent_rule_check') then
    alter table public.reservations add constraint reservations_parent_rule_check check (
      (under_18 = false and parent_permission = false and parent_phone is null)
      or (under_18 = true and parent_permission = true
          and parent_phone is not null and char_length(parent_phone) between 5 and 40)
    );
  end if;
end $$;

alter table public.volunteers
  add column if not exists parent_permission boolean not null default false,
  add column if not exists parent_phone text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'volunteers_parent_phone_check') then
    alter table public.volunteers add constraint volunteers_parent_phone_check
      check (parent_phone is null or char_length(parent_phone) between 5 and 40);
  end if;
end $$;

-- Column-level insert rights, matching migration_002. Without this grant the
-- website cannot save the new volunteer fields.
grant insert (parent_permission, parent_phone) on public.volunteers to anon, authenticated;

-- Insert only, so an admin can still update an older "Under 18" volunteer
-- (for example to mark them contacted) before a parent phone was collected.
create or replace function public.volunteers_require_parent() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.age_range = 'Under 18' then
    if new.parent_permission is not true
       or new.parent_phone is null
       or char_length(btrim(new.parent_phone)) not between 5 and 40 then
      raise exception 'A parent or guardian must agree, and their phone number is required, when the age range is Under 18.'
        using errcode = 'P0001';
    end if;
    new.parent_phone := btrim(new.parent_phone);
    new.parent_permission := true;
  end if;
  return new;
end $$;
revoke all on function public.volunteers_require_parent() from public;
grant execute on function public.volunteers_require_parent() to anon, authenticated;

drop trigger if exists volunteers_require_parent on public.volunteers;
create trigger volunteers_require_parent
  before insert on public.volunteers
  for each row execute function public.volunteers_require_parent();

-- New overload. Do not drop reserve_seat(uuid, text, text, text, int).
create or replace function public.reserve_seat(
  p_event_id uuid, p_name text, p_phone text, p_email text, p_seats int,
  p_under_18 boolean, p_parent_permission boolean, p_parent_phone text
) returns json
language plpgsql security definer set search_path = public as $$
declare
  ev public.events%rowtype;
  taken int;
  mine int;
  code text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
begin
  p_name := btrim(coalesce(p_name, '')); p_phone := btrim(coalesce(p_phone, ''));
  p_email := nullif(btrim(coalesce(p_email, '')), '');
  p_under_18 := coalesce(p_under_18, false);
  if char_length(p_name) not between 1 and 120 then raise exception 'Please enter your name.' using errcode = 'P0001'; end if;
  if char_length(p_phone) not between 5 and 40 then raise exception 'Please enter a phone number.' using errcode = 'P0001'; end if;
  if p_seats is null or p_seats not between 1 and 5 then raise exception 'You can reserve between 1 and 5 seats.' using errcode = 'P0001'; end if;

  if not p_under_18 then
    p_parent_permission := false;
    p_parent_phone := null;
  else
    p_parent_phone := nullif(btrim(coalesce(p_parent_phone, '')), '');
    if p_parent_permission is not true then
      raise exception 'A parent or guardian must agree before we can reserve this seat.' using errcode = 'P0001';
    end if;
    if p_parent_phone is null or char_length(p_parent_phone) not between 5 and 40 then
      raise exception 'Please enter a parent or guardian phone number.' using errcode = 'P0001';
    end if;
    p_parent_permission := true;
  end if;

  select * into ev from public.events where id = p_event_id for update;
  if not found then raise exception 'We could not find that event.' using errcode = 'P0001'; end if;
  if ev.status <> 'upcoming' or (ev.event_date is not null and ev.event_date < current_date) then
    raise exception 'Reservations for this event are closed.' using errcode = 'P0001';
  end if;

  select coalesce(sum(seats), 0) into taken from public.reservations where event_id = p_event_id;
  if ev.capacity is not null and taken + p_seats > ev.capacity then
    raise exception 'Sorry, only % seat(s) are left for this event.', greatest(ev.capacity - taken, 0) using errcode = 'P0001';
  end if;
  select coalesce(sum(seats), 0) into mine from public.reservations
   where event_id = p_event_id and regexp_replace(phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g');
  if mine + p_seats > 5 then
    raise exception 'This phone number already has seats reserved for this event (up to 5 per person).' using errcode = 'P0001';
  end if;

  loop
    code := 'CYA-';
    for i in 1..6 loop code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from public.reservations where ticket_code = code);
  end loop;

  insert into public.reservations (
    event_id, ticket_code, full_name, phone, email, seats,
    under_18, parent_permission, parent_phone
  ) values (
    p_event_id, code, p_name, p_phone, p_email, p_seats,
    p_under_18, p_parent_permission, p_parent_phone
  );

  return json_build_object('code', code, 'seats', p_seats,
    'seats_left', case when ev.capacity is null then null else ev.capacity - taken - p_seats end);
end $$;
revoke all on function public.reserve_seat(uuid, text, text, text, int, boolean, boolean, text) from public;
grant execute on function public.reserve_seat(uuid, text, text, text, int, boolean, boolean, text) to anon, authenticated;

notify pgrst, 'reload schema';
