-- MedConnect medical directory schema.
-- This migration is intentionally not applied because no Supabase project is connected.
-- Review policies with a security specialist before storing healthcare or identity data.

create extension if not exists pgcrypto;

create type public.verification_status as enum ('pending', 'verified', 'rejected');
create type public.publication_status as enum ('draft', 'published', 'suspended');
create type public.consultation_mode as enum ('in_person', 'video');
create type public.slot_status as enum ('available', 'held', 'booked', 'blocked');
create type public.review_status as enum ('pending', 'approved', 'rejected', 'reported');
create type public.specialty_assignment as enum ('primary', 'additional');

create table public.specialties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  category text not null,
  description text not null default '',
  icon text,
  active_status boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  city text not null,
  state text,
  postal_code text,
  country text not null,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  public_contact_details jsonb not null default '{}'::jsonb,
  opening_hours jsonb not null default '{}'::jsonb,
  affiliation_status public.verification_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null check (char_length(full_name) between 2 and 160),
  professional_title text not null,
  profile_photo_url text,
  primary_specialty_id uuid references public.specialties(id) on delete restrict,
  qualifications jsonb not null default '[]'::jsonb,
  registration_number_encrypted text,
  registration_display text,
  registration_jurisdiction text,
  verified_credentials_status public.verification_status not null default 'pending',
  verified_career_start_date date,
  biography text not null default '',
  languages text[] not null default '{}',
  consultation_modes public.consultation_mode[] not null default '{}',
  consultation_fee numeric(12,2) check (consultation_fee >= 0),
  currency char(3) not null default 'INR',
  clinic_id uuid references public.clinics(id) on delete set null,
  age_groups_served text[] not null default '{}',
  publication_status public.publication_status not null default 'draft',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verified_publication_guard check (
    publication_status <> 'published'
    or (verified_credentials_status = 'verified' and approved_by is not null and approved_at is not null)
  )
);

create table public.doctor_specialties (
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  specialty_id uuid not null references public.specialties(id) on delete restrict,
  assignment public.specialty_assignment not null default 'additional',
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  primary key (doctor_id, specialty_id)
);

create table public.conditions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  category text not null,
  overview text not null,
  alternative_names text[] not null default '{}',
  educational_content jsonb not null default '{}'::jsonb,
  urgency_guidance text not null,
  publication_status public.publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.doctor_conditions (
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  condition_id uuid not null references public.conditions(id) on delete restrict,
  expertise_description text not null,
  service_available boolean not null default true,
  verified_by uuid references auth.users(id) on delete set null,
  verification_date date,
  primary key (doctor_id, condition_id),
  constraint expertise_verification_guard check (
    not service_available or (verified_by is not null and verification_date is not null)
  )
);

create table public.doctor_availability (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  consultation_mode public.consultation_mode not null,
  slot_status public.slot_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_slot_duration check (end_time > start_time)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete cascade,
  appointment_id uuid not null,
  rating smallint not null check (rating between 1 and 5),
  review_text text check (char_length(review_text) <= 4000),
  moderation_status public.review_status not null default 'pending',
  report_reason text,
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (patient_id, appointment_id)
);

create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, doctor_id)
);

create table public.provider_verification_audit (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  from_status public.verification_status,
  to_status public.verification_status not null,
  evidence_refs jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('patient', 'doctor', 'administrator')),
  created_at timestamptz not null default now()
);

create index doctors_primary_specialty_idx on public.doctors(primary_specialty_id);
create index doctors_clinic_idx on public.doctors(clinic_id);
create index doctors_publication_idx on public.doctors(publication_status, verified_credentials_status);
create index doctors_languages_gin_idx on public.doctors using gin(languages);
create index doctors_age_groups_gin_idx on public.doctors using gin(age_groups_served);
create index specialties_category_idx on public.specialties(category) where active_status;
create index conditions_category_idx on public.conditions(category) where publication_status = 'published';
create index doctor_conditions_condition_idx on public.doctor_conditions(condition_id) where service_available;
create index availability_lookup_idx on public.doctor_availability(doctor_id, start_time, slot_status);
create index reviews_public_idx on public.reviews(doctor_id, created_at desc) where moderation_status = 'approved';
create index clinics_city_idx on public.clinics(city);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'administrator'
  );
$$;

create or replace function public.is_doctor_owner(target_doctor_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.doctors
    where id = target_doctor_id and user_id = auth.uid()
  );
$$;

alter table public.specialties enable row level security;
alter table public.clinics enable row level security;
alter table public.doctors enable row level security;
alter table public.doctor_specialties enable row level security;
alter table public.conditions enable row level security;
alter table public.doctor_conditions enable row level security;
alter table public.doctor_availability enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.provider_verification_audit enable row level security;
alter table public.user_roles enable row level security;

create policy "public reads active specialties" on public.specialties for select using (active_status);
create policy "public reads verified clinics" on public.clinics for select using (affiliation_status = 'verified');
create policy "public reads verified published doctors" on public.doctors for select using (
  publication_status = 'published' and verified_credentials_status = 'verified'
);
create policy "doctor reads own record" on public.doctors for select to authenticated using (user_id = auth.uid());
create policy "public reads published conditions" on public.conditions for select using (publication_status = 'published');
create policy "public reads verified specialty assignments" on public.doctor_specialties for select using (verified_at is not null);
create policy "public reads verified condition expertise" on public.doctor_conditions for select using (
  service_available and verified_by is not null and verification_date is not null
);
create policy "public reads available future slots" on public.doctor_availability for select using (
  slot_status = 'available' and start_time > now()
);
create policy "public reads approved reviews" on public.reviews for select using (moderation_status = 'approved');
create policy "patient reads own reviews" on public.reviews for select to authenticated using (patient_id = auth.uid());
create policy "patient creates own review" on public.reviews for insert to authenticated with check (
  patient_id = auth.uid() and moderation_status = 'pending'
);
create policy "patient updates pending own review" on public.reviews for update to authenticated using (
  patient_id = auth.uid() and moderation_status = 'pending'
) with check (patient_id = auth.uid() and moderation_status in ('pending', 'reported'));
create policy "user manages own favorites" on public.favorites for all to authenticated using (
  user_id = auth.uid()
) with check (user_id = auth.uid());
create policy "admin manages specialties" on public.specialties for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manages clinics" on public.clinics for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manages doctors" on public.doctors for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manages doctor specialties" on public.doctor_specialties for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manages conditions" on public.conditions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manages doctor conditions" on public.doctor_conditions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "doctor reads own availability" on public.doctor_availability for select to authenticated using (public.is_doctor_owner(doctor_id));
create policy "admin manages availability" on public.doctor_availability for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin moderates reviews" on public.reviews for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin reads audit log" on public.provider_verification_audit for select to authenticated using (public.is_admin());
create policy "admin writes audit log" on public.provider_verification_audit for insert to authenticated with check (
  public.is_admin() and actor_id = auth.uid()
);
create policy "admin manages roles" on public.user_roles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "user reads own role" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- Reserve availability atomically from trusted server code. A production version
-- must reference the real appointments table and validate patient authorization.
create or replace function public.hold_doctor_slot(slot_id uuid)
returns public.doctor_availability
language plpgsql
security definer
set search_path = public
as $$
declare selected_slot public.doctor_availability;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  update public.doctor_availability
    set slot_status = 'held', updated_at = now()
    where id = slot_id and slot_status = 'available' and start_time > now()
    returning * into selected_slot;
  if selected_slot.id is null then raise exception 'slot unavailable'; end if;
  return selected_slot;
end;
$$;

revoke all on function public.hold_doctor_slot(uuid) from public;
grant execute on function public.hold_doctor_slot(uuid) to authenticated;
