-- Кандидаты
create table candidates (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name text not null,
  phone text not null,
  telegram text,
  age_range text,
  gender text,
  housing_needed boolean,
  country text,
  citizenship text,
  departure text,
  test_score integer,
  test_answers jsonb,
  source text default 'direct',
  status text default 'new',
  category text default 'blue_collar'
);

-- Заявки работодателей
create table employer_requests (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  company text not null,
  country text not null,
  specialty text not null,
  headcount integer not null,
  start_date date,
  housing_provided text,
  contact_name text not null,
  phone text not null,
  notes text,
  status text default 'new'
);
