-- Security hardening (2026-10-30)

-- 1. PROFILES: customers may edit their own name/phone, never their status or email.
drop policy if exists "Users can update their own profile" on public.profiles;

create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.is_active       := old.is_active;
    new.email           := old.email;
    new.created_at      := old.created_at;
    new.last_sign_in_at := old.last_sign_in_at;
    new.id              := old.id;
  end if;
  return new;
end; $$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- 2. APPOINTMENTS: sane sizes, visitors cannot pre-confirm, and simple flood control.
alter table public.appointments drop constraint if exists appointments_sizes_check;
alter table public.appointments add constraint appointments_sizes_check check (
  char_length(coalesce(name, ''))           <= 120 and
  char_length(coalesce(phone, ''))          <= 30  and
  char_length(coalesce(email, ''))          <= 254 and
  char_length(coalesce(purpose, ''))        <= 120 and
  char_length(coalesce(preferred_time, '')) <= 40  and
  char_length(coalesce(notes, ''))          <= 2000
) not valid;

create or replace function public.guard_public_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  new.status := 'new';
  new.source := 'website';
  new.created_at := now();
  new.updated_at := now();
  if (select count(*) from public.appointments where created_at > now() - interval '1 minute') >= 5
     or (new.phone is not null and (select count(*) from public.appointments
          where phone = new.phone and created_at > now() - interval '1 hour') >= 3) then
    raise exception 'Too many booking requests. Please try again a little later.' using errcode = 'P0001';
  end if;
  return new;
end; $$;

drop trigger if exists guard_public_appointment on public.appointments;
create trigger guard_public_appointment before insert on public.appointments
  for each row execute function public.guard_public_appointment();
