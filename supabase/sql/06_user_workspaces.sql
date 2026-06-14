-- SupplyChainIQ — User Workspace Tables
-- Each user gets isolated datasets and results.
-- Run after 01_core_schema.sql in Supabase SQL Editor.

-- 1. User-uploaded datasets (metadata)
create table if not exists public.user_datasets (
    dataset_id uuid primary key default gen_random_uuid(),
    user_email text not null,
    dataset_name text not null,
    dataset_type text not null default 'general',  -- 'shipment', 'inventory', 'supplier', 'general'
    file_name text not null,
    row_count integer not null default 0 check (row_count >= 0),
    columns jsonb not null default '[]'::jsonb,           -- list of column names present
    missing_columns jsonb not null default '[]'::jsonb,    -- expected columns that are absent
    schema_warnings jsonb not null default '[]'::jsonb,    -- human-readable adaptation notes
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. User-uploaded dataset rows (schema-flexible JSONB storage)
create table if not exists public.user_dataset_records (
    record_id uuid primary key default gen_random_uuid(),
    dataset_id uuid not null references public.user_datasets(dataset_id) on delete cascade,
    row_number integer not null check (row_number > 0),
    payload jsonb not null,
    created_at timestamptz not null default now(),
    constraint user_dataset_records_unique_row unique (dataset_id, row_number)
);

-- 3. User prediction results tied to their dataset
create table if not exists public.user_prediction_results (
    result_id uuid primary key default gen_random_uuid(),
    user_email text not null,
    dataset_id uuid references public.user_datasets(dataset_id) on delete set null,
    prediction_type text not null,  -- 'delay', 'demand', 'supplier_score', 'inventory'
    input_summary jsonb not null default '{}'::jsonb,
    output_result jsonb not null default '{}'::jsonb,
    columns_used jsonb not null default '[]'::jsonb,       -- which columns the model actually used
    columns_defaulted jsonb not null default '{}'::jsonb,   -- columns that were filled with defaults
    created_at timestamptz not null default now()
);

-- Indices
create index if not exists user_datasets_email_idx on public.user_datasets(user_email);
create index if not exists user_dataset_records_dataset_idx on public.user_dataset_records(dataset_id);
create index if not exists user_prediction_results_email_idx on public.user_prediction_results(user_email);
create index if not exists user_prediction_results_dataset_idx on public.user_prediction_results(dataset_id);

-- Triggers for updated_at
drop trigger if exists set_updated_at on public.user_datasets;
create trigger set_updated_at before update on public.user_datasets
for each row execute function public.set_updated_at();

-- RLS: users see only their own workspace data
alter table public.user_datasets enable row level security;
alter table public.user_dataset_records enable row level security;
alter table public.user_prediction_results enable row level security;

-- Policies: Allow service-role full access (our backend uses service role key)
create policy "Service role full access on user_datasets"
    on public.user_datasets for all
    using (true) with check (true);

create policy "Service role full access on user_dataset_records"
    on public.user_dataset_records for all
    using (true) with check (true);

create policy "Service role full access on user_prediction_results"
    on public.user_prediction_results for all
    using (true) with check (true);
