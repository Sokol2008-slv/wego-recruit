-- ============================================
-- WEGO Recruitment Platform — Database Schema
-- Запускать в Supabase SQL Editor
-- ============================================

-- 1. Таблица кандидатов (обновлённая)
create table if not exists candidates (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name text not null,
  surname text not null default '',
  phone text not null,
  telegram text,
  has_telegram boolean default true,
  telegram_id text unique,
  location text,
  age_range text,
  citizenship text,
  work_permit text,
  job_type text[] default '{}',
  country text,
  housing_needed text,
  start_date text,
  schedule text,
  couple text,
  polish_level text,
  restrictions text,
  restrictions_comment text,
  extra_info text,
  auth_token text,
  registered boolean default false,
  source text default 'direct',
  status text default 'new'
);

-- 2. Таблица работодателей
create table if not exists employers (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  company text not null,
  contact_name text not null,
  phone text,
  telegram_chat_id text unique,
  telegram_username text,
  active boolean default true
);

-- 3. Таблица вакансий
create table if not exists vacancies (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  employer_id uuid references employers(id),
  title text not null,
  company text not null,
  country text not null,
  city text not null,
  salary text,
  housing boolean default false,
  schedule text,
  description text,
  requirements text,
  departure_options text[] default '{}',
  tags text[] default '{}',
  headcount integer default 1,
  active boolean default true,
  category text default 'blue_collar'
);

-- 4. Таблица заявок
create table if not exists applications (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  candidate_id uuid references candidates(id) not null,
  vacancy_id uuid references vacancies(id) not null,
  status text default 'pending',
  employer_response_at timestamptz,
  worker_selected_at timestamptz,
  unique(candidate_id, vacancy_id)
);

-- 5. Таблица запросов работодателей
create table if not exists employer_requests (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  company text not null,
  country text not null,
  specialty text not null,
  headcount integer default 1,
  start_date text,
  housing_provided text,
  contact_name text not null,
  phone text not null,
  notes text,
  status text default 'new'
);

-- Индексы
create index if not exists idx_candidates_phone on candidates(phone);
create index if not exists idx_vacancies_active on vacancies(active) where active = true;
create index if not exists idx_applications_candidate on applications(candidate_id);
create index if not exists idx_applications_vacancy on applications(vacancy_id);
create index if not exists idx_applications_status on applications(status);

-- 6. Таблица встреч
create table if not exists meetings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  application_id uuid references applications(id) not null,
  candidate_id uuid references candidates(id) not null,
  vacancy_id uuid references vacancies(id) not null,
  scheduled_at timestamptz not null,
  docs_status text default 'pending', -- pending, approved, rejected
  docs_approved_at timestamptz,
  reminder_sent boolean default false,
  confirmation_sent boolean default false,
  candidate_confirmed boolean default null,
  candidate_confirmed_at timestamptz,
  status text default 'scheduled', -- scheduled, confirmed, no_response, cancelled, completed
  cancelled_at timestamptz,
  cancel_reason text,
  notes text
);

create index if not exists idx_meetings_candidate on meetings(candidate_id);
create index if not exists idx_meetings_status on meetings(status);
create index if not exists idx_meetings_scheduled on meetings(scheduled_at);
