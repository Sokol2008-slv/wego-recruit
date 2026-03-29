-- Миграция: таблица встреч
-- Запустить в Supabase SQL Editor

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
