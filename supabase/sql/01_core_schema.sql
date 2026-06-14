-- SupplyChainIQ Database Core Schema Setup
-- Run in Supabase Dashboard > SQL Editor > New Query after 00_extensions_and_types.sql.
-- Purpose: create core application, ingestion, analytics, ML, and recommendation tables.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    app_role public.app_role not null default 'analyst',
    organization_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.etl_batch_runs (
    batch_id uuid primary key default gen_random_uuid(),
    pipeline_name text not null,
    source_name text not null,
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    status public.etl_status not null default 'running',
    rows_read integer not null default 0 check (rows_read >= 0),
    rows_inserted integer not null default 0 check (rows_inserted >= 0),
    rows_rejected integer not null default 0 check (rows_rejected >= 0),
    error_message text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint etl_finished_after_started
        check (finished_at is null or finished_at >= started_at)
);

create table if not exists public.data_quality_issues (
    issue_id uuid primary key default gen_random_uuid(),
    batch_id uuid references public.etl_batch_runs(batch_id) on delete cascade,
    table_name text,
    row_identifier text,
    severity public.data_quality_severity not null default 'warning',
    issue_type text not null,
    issue_description text not null,
    raw_payload jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.raw_source_files (
    file_id uuid primary key default gen_random_uuid(),
    batch_id uuid references public.etl_batch_runs(batch_id) on delete set null,
    source_name text not null,
    file_name text not null,
    file_type text,
    file_hash text,
    storage_path text,
    row_count integer check (row_count is null or row_count >= 0),
    uploaded_by uuid references auth.users(id) on delete set null,
    metadata jsonb not null default '{}'::jsonb,
    received_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.raw_source_records (
    raw_record_id uuid primary key default gen_random_uuid(),
    file_id uuid not null references public.raw_source_files(file_id) on delete cascade,
    source_name text not null,
    source_row_number integer not null check (source_row_number > 0),
    payload jsonb not null,
    ingested_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint raw_source_records_file_row_unique unique (file_id, source_row_number)
);

create table if not exists public.dim_locations (
    location_id uuid primary key default gen_random_uuid(),
    location_code text not null unique,
    location_name text not null,
    location_type public.location_type not null,
    city text,
    state text,
    country text not null default 'Unknown',
    region text,
    latitude numeric(9,6) check (latitude is null or latitude between -90 and 90),
    longitude numeric(9,6) check (longitude is null or longitude between -180 and 180),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.dim_products (
    product_id uuid primary key default gen_random_uuid(),
    sku text not null unique,
    product_name text not null,
    category text,
    subcategory text,
    brand text,
    unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
    unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
    weight_kg numeric(10,3) check (weight_kg is null or weight_kg >= 0),
    shelf_life_days integer check (shelf_life_days is null or shelf_life_days >= 0),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.dim_suppliers (
    supplier_id uuid primary key default gen_random_uuid(),
    supplier_code text not null unique,
    supplier_name text not null,
    country text not null default 'Unknown',
    region text,
    contact_email text,
    payment_terms text,
    default_lead_time_days integer check (default_lead_time_days is null or default_lead_time_days >= 0),
    contract_status text not null default 'active',
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.supplier_products (
    supplier_product_id uuid primary key default gen_random_uuid(),
    supplier_id uuid not null references public.dim_suppliers(supplier_id) on delete cascade,
    product_id uuid not null references public.dim_products(product_id) on delete cascade,
    supplier_sku text,
    contracted_unit_cost numeric(12,2) check (contracted_unit_cost is null or contracted_unit_cost >= 0),
    min_order_quantity integer check (min_order_quantity is null or min_order_quantity >= 0),
    lead_time_days integer check (lead_time_days is null or lead_time_days >= 0),
    is_preferred boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint supplier_products_supplier_product_unique unique (supplier_id, product_id)
);

create table if not exists public.dim_carriers (
    carrier_id uuid primary key default gen_random_uuid(),
    carrier_code text not null unique,
    carrier_name text not null,
    transport_mode public.transport_mode not null,
    contact_email text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.fact_purchase_orders (
    purchase_order_id uuid primary key default gen_random_uuid(),
    po_number text not null unique,
    supplier_id uuid not null references public.dim_suppliers(supplier_id),
    product_id uuid not null references public.dim_products(product_id),
    order_date date not null,
    expected_delivery_date date not null,
    actual_delivery_date date,
    ordered_quantity integer not null check (ordered_quantity > 0),
    received_quantity integer not null default 0 check (received_quantity >= 0),
    unit_cost numeric(12,2) not null check (unit_cost >= 0),
    status public.purchase_order_status not null default 'placed',
    defect_quantity integer not null default 0 check (defect_quantity >= 0),
    quality_score numeric(5,2) check (quality_score is null or quality_score between 0 and 100),
    batch_id uuid references public.etl_batch_runs(batch_id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint purchase_order_delivery_after_order
        check (expected_delivery_date >= order_date and (actual_delivery_date is null or actual_delivery_date >= order_date)),
    constraint purchase_order_received_not_over_ordered
        check (received_quantity <= ordered_quantity),
    constraint purchase_order_defects_not_over_received
        check (defect_quantity <= received_quantity)
);

create table if not exists public.fact_customer_orders (
    customer_order_id uuid primary key default gen_random_uuid(),
    order_number text not null unique,
    customer_location_id uuid not null references public.dim_locations(location_id),
    product_id uuid not null references public.dim_products(product_id),
    order_date date not null,
    promised_delivery_date date,
    actual_delivery_date date,
    ordered_quantity integer not null check (ordered_quantity > 0),
    fulfilled_quantity integer not null default 0 check (fulfilled_quantity >= 0),
    unit_price numeric(12,2) not null check (unit_price >= 0),
    status public.customer_order_status not null default 'open',
    delivery_delay_days integer generated always as (
        case
            when actual_delivery_date is null or promised_delivery_date is null then null
            else greatest(actual_delivery_date - promised_delivery_date, 0)
        end
    ) stored,
    batch_id uuid references public.etl_batch_runs(batch_id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint customer_order_fulfilled_not_over_ordered
        check (fulfilled_quantity <= ordered_quantity),
    constraint customer_order_delivery_after_order
        check (actual_delivery_date is null or actual_delivery_date >= order_date)
);

create table if not exists public.fact_sales_demand (
    demand_id uuid primary key default gen_random_uuid(),
    demand_date date not null,
    product_id uuid not null references public.dim_products(product_id),
    location_id uuid not null references public.dim_locations(location_id),
    sales_channel text not null default 'unknown',
    quantity_demanded integer not null check (quantity_demanded >= 0),
    quantity_sold integer not null default 0 check (quantity_sold >= 0),
    lost_sales_quantity integer not null default 0 check (lost_sales_quantity >= 0),
    revenue numeric(14,2) not null default 0 check (revenue >= 0),
    batch_id uuid references public.etl_batch_runs(batch_id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint sales_demand_fulfillment_not_over_demanded
        check (quantity_sold + lost_sales_quantity <= quantity_demanded),
    constraint sales_demand_unique_grain
        unique (demand_date, product_id, location_id, sales_channel)
);

create table if not exists public.fact_inventory_snapshots (
    inventory_snapshot_id uuid primary key default gen_random_uuid(),
    snapshot_date date not null,
    product_id uuid not null references public.dim_products(product_id),
    location_id uuid not null references public.dim_locations(location_id),
    on_hand_quantity integer not null check (on_hand_quantity >= 0),
    reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
    available_quantity integer generated always as (on_hand_quantity - reserved_quantity) stored,
    reorder_point integer not null default 0 check (reorder_point >= 0),
    safety_stock integer not null default 0 check (safety_stock >= 0),
    unit_cost_snapshot numeric(12,2) not null default 0 check (unit_cost_snapshot >= 0),
    inventory_value numeric(14,2) generated always as (on_hand_quantity * unit_cost_snapshot) stored,
    batch_id uuid references public.etl_batch_runs(batch_id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint inventory_reserved_not_over_on_hand
        check (reserved_quantity <= on_hand_quantity),
    constraint inventory_snapshot_unique_grain
        unique (snapshot_date, product_id, location_id)
);

create table if not exists public.fact_shipments (
    shipment_id uuid primary key default gen_random_uuid(),
    shipment_number text not null unique,
    carrier_id uuid references public.dim_carriers(carrier_id),
    supplier_id uuid references public.dim_suppliers(supplier_id),
    product_id uuid not null references public.dim_products(product_id),
    source_location_id uuid references public.dim_locations(location_id),
    destination_location_id uuid not null references public.dim_locations(location_id),
    purchase_order_id uuid references public.fact_purchase_orders(purchase_order_id) on delete set null,
    customer_order_id uuid references public.fact_customer_orders(customer_order_id) on delete set null,
    ship_date date not null,
    expected_delivery_date date not null,
    actual_delivery_date date,
    shipped_quantity integer not null check (shipped_quantity > 0),
    delivered_quantity integer not null default 0 check (delivered_quantity >= 0),
    freight_cost numeric(12,2) not null default 0 check (freight_cost >= 0),
    distance_km numeric(12,2) check (distance_km is null or distance_km >= 0),
    status public.shipment_status not null default 'planned',
    delay_days integer generated always as (
        case
            when actual_delivery_date is null then null
            else greatest(actual_delivery_date - expected_delivery_date, 0)
        end
    ) stored,
    is_delayed boolean generated always as (
        case
            when actual_delivery_date is null then null
            else actual_delivery_date > expected_delivery_date
        end
    ) stored,
    batch_id uuid references public.etl_batch_runs(batch_id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint shipment_delivery_after_ship
        check (expected_delivery_date >= ship_date and (actual_delivery_date is null or actual_delivery_date >= ship_date)),
    constraint shipment_delivered_not_over_shipped
        check (delivered_quantity <= shipped_quantity)
);

create table if not exists public.model_registry (
    model_id uuid primary key default gen_random_uuid(),
    model_name text not null,
    model_type public.model_type not null,
    version text not null,
    target_variable text not null,
    algorithm text not null,
    training_start_date date,
    training_end_date date,
    metrics jsonb not null default '{}'::jsonb,
    artifact_path text,
    is_active boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint model_registry_model_version_unique unique (model_name, version),
    constraint model_registry_training_window
        check (training_end_date is null or training_start_date is null or training_end_date >= training_start_date)
);

create table if not exists public.demand_forecasts (
    forecast_id uuid primary key default gen_random_uuid(),
    model_id uuid not null references public.model_registry(model_id),
    product_id uuid not null references public.dim_products(product_id),
    location_id uuid not null references public.dim_locations(location_id),
    forecast_date date not null,
    forecast_horizon_days integer not null check (forecast_horizon_days > 0),
    predicted_quantity numeric(14,2) not null check (predicted_quantity >= 0),
    lower_bound numeric(14,2) check (lower_bound is null or lower_bound >= 0),
    upper_bound numeric(14,2) check (upper_bound is null or upper_bound >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint demand_forecast_bounds_valid
        check (
            (lower_bound is null or lower_bound <= predicted_quantity)
            and (upper_bound is null or predicted_quantity <= upper_bound)
            and (lower_bound is null or upper_bound is null or lower_bound <= upper_bound)
        ),
    constraint demand_forecast_unique_grain
        unique (model_id, product_id, location_id, forecast_date, forecast_horizon_days)
);

create table if not exists public.shipment_delay_predictions (
    prediction_id uuid primary key default gen_random_uuid(),
    model_id uuid not null references public.model_registry(model_id),
    shipment_id uuid not null references public.fact_shipments(shipment_id) on delete cascade,
    predicted_delay_probability numeric(5,4) not null check (predicted_delay_probability between 0 and 1),
    predicted_delay_days numeric(8,2) check (predicted_delay_days is null or predicted_delay_days >= 0),
    risk_level public.risk_level not null,
    explanation jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint shipment_delay_prediction_unique unique (model_id, shipment_id)
);

create table if not exists public.supplier_performance_scores (
    supplier_score_id uuid primary key default gen_random_uuid(),
    model_id uuid references public.model_registry(model_id),
    supplier_id uuid not null references public.dim_suppliers(supplier_id) on delete cascade,
    score_date date not null,
    delivery_score numeric(5,2) not null check (delivery_score between 0 and 100),
    quality_score numeric(5,2) not null check (quality_score between 0 and 100),
    cost_score numeric(5,2) not null check (cost_score between 0 and 100),
    reliability_score numeric(5,2) not null check (reliability_score between 0 and 100),
    overall_score numeric(5,2) not null check (overall_score between 0 and 100),
    risk_tier public.risk_level not null,
    explanation jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.inventory_recommendations (
    inventory_recommendation_id uuid primary key default gen_random_uuid(),
    model_id uuid references public.model_registry(model_id),
    product_id uuid not null references public.dim_products(product_id),
    location_id uuid not null references public.dim_locations(location_id),
    recommendation_date date not null,
    current_stock integer not null check (current_stock >= 0),
    forecasted_demand numeric(14,2) not null check (forecasted_demand >= 0),
    reorder_point integer not null check (reorder_point >= 0),
    recommended_order_quantity integer not null check (recommended_order_quantity >= 0),
    safety_stock integer not null check (safety_stock >= 0),
    expected_stockout_date date,
    priority public.risk_level not null default 'medium',
    status public.recommendation_status not null default 'open',
    rationale text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint inventory_recommendation_unique_grain
        unique (product_id, location_id, recommendation_date)
);

create table if not exists public.business_recommendations (
    business_recommendation_id uuid primary key default gen_random_uuid(),
    related_inventory_recommendation_id uuid references public.inventory_recommendations(inventory_recommendation_id) on delete set null,
    supplier_id uuid references public.dim_suppliers(supplier_id) on delete set null,
    shipment_id uuid references public.fact_shipments(shipment_id) on delete set null,
    product_id uuid references public.dim_products(product_id) on delete set null,
    location_id uuid references public.dim_locations(location_id) on delete set null,
    recommendation_type public.recommendation_type not null,
    severity public.risk_level not null default 'medium',
    title text not null,
    description text not null,
    action_owner text,
    status public.recommendation_status not null default 'open',
    expected_impact_value numeric(14,2) check (expected_impact_value is null or expected_impact_value >= 0),
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    resolved_at timestamptz,
    constraint business_recommendation_resolved_after_created
        check (resolved_at is null or resolved_at >= created_at)
);

create unique index if not exists raw_source_files_hash_unique
    on public.raw_source_files (source_name, file_hash)
    where file_hash is not null;

create index if not exists raw_source_records_file_id_idx on public.raw_source_records(file_id);
create index if not exists data_quality_issues_batch_id_idx on public.data_quality_issues(batch_id);
create index if not exists supplier_products_product_id_idx on public.supplier_products(product_id);
create index if not exists purchase_orders_supplier_date_idx on public.fact_purchase_orders(supplier_id, order_date);
create index if not exists purchase_orders_product_date_idx on public.fact_purchase_orders(product_id, order_date);
create index if not exists customer_orders_product_date_idx on public.fact_customer_orders(product_id, order_date);
create index if not exists sales_demand_product_location_date_idx on public.fact_sales_demand(product_id, location_id, demand_date);
create index if not exists inventory_product_location_date_idx on public.fact_inventory_snapshots(product_id, location_id, snapshot_date desc);
create index if not exists shipments_product_date_idx on public.fact_shipments(product_id, ship_date);
create index if not exists shipments_carrier_date_idx on public.fact_shipments(carrier_id, ship_date);
create index if not exists shipments_supplier_date_idx on public.fact_shipments(supplier_id, ship_date);
create index if not exists demand_forecasts_product_location_date_idx on public.demand_forecasts(product_id, location_id, forecast_date);
create index if not exists delay_predictions_shipment_id_idx on public.shipment_delay_predictions(shipment_id);
create index if not exists supplier_scores_supplier_date_idx on public.supplier_performance_scores(supplier_id, score_date desc);
create index if not exists inventory_recommendations_product_location_date_idx on public.inventory_recommendations(product_id, location_id, recommendation_date desc);
create index if not exists business_recommendations_status_severity_idx on public.business_recommendations(status, severity);

create unique index if not exists model_registry_one_active_per_type_idx
    on public.model_registry(model_type)
    where is_active;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.etl_batch_runs;
create trigger set_updated_at before update on public.etl_batch_runs
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.data_quality_issues;
create trigger set_updated_at before update on public.data_quality_issues
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.raw_source_files;
create trigger set_updated_at before update on public.raw_source_files
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.raw_source_records;
create trigger set_updated_at before update on public.raw_source_records
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.dim_locations;
create trigger set_updated_at before update on public.dim_locations
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.dim_products;
create trigger set_updated_at before update on public.dim_products
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.dim_suppliers;
create trigger set_updated_at before update on public.dim_suppliers
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.supplier_products;
create trigger set_updated_at before update on public.supplier_products
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.dim_carriers;
create trigger set_updated_at before update on public.dim_carriers
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.fact_purchase_orders;
create trigger set_updated_at before update on public.fact_purchase_orders
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.fact_customer_orders;
create trigger set_updated_at before update on public.fact_customer_orders
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.fact_sales_demand;
create trigger set_updated_at before update on public.fact_sales_demand
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.fact_inventory_snapshots;
create trigger set_updated_at before update on public.fact_inventory_snapshots
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.fact_shipments;
create trigger set_updated_at before update on public.fact_shipments
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.model_registry;
create trigger set_updated_at before update on public.model_registry
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.demand_forecasts;
create trigger set_updated_at before update on public.demand_forecasts
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.shipment_delay_predictions;
create trigger set_updated_at before update on public.shipment_delay_predictions
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.supplier_performance_scores;
create trigger set_updated_at before update on public.supplier_performance_scores
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.inventory_recommendations;
create trigger set_updated_at before update on public.inventory_recommendations
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.business_recommendations;
create trigger set_updated_at before update on public.business_recommendations
for each row execute function public.set_updated_at();
