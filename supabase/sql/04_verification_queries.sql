-- SupplyChainIQ Database Verification Queries
-- Run in Supabase Dashboard > SQL Editor > New Query after 03_bi_views.sql.
-- Purpose: verify tables, views, RLS, and foreign keys were created.

select
    count(*) as created_table_count
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
  and table_name in (
    'profiles',
    'etl_batch_runs',
    'data_quality_issues',
    'raw_source_files',
    'raw_source_records',
    'dim_locations',
    'dim_products',
    'dim_suppliers',
    'supplier_products',
    'dim_carriers',
    'fact_purchase_orders',
    'fact_customer_orders',
    'fact_sales_demand',
    'fact_inventory_snapshots',
    'fact_shipments',
    'model_registry',
    'demand_forecasts',
    'shipment_delay_predictions',
    'supplier_performance_scores',
    'inventory_recommendations',
    'business_recommendations'
  );

select
    table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;

select
    c.relname as table_name,
    c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname not like 'pg_%'
order by c.relname;

select
    table_name as view_name
from information_schema.views
where table_schema = 'public'
  and table_name like 'bi_%'
order by table_name;

select
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as references_table
from pg_constraint
where contype = 'f'
  and connamespace = 'public'::regnamespace
order by conrelid::regclass::text, conname;

select * from public.bi_executive_kpis;
