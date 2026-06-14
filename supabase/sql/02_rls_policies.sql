-- SupplyChainIQ Database Row-Level Security Policies Setup
-- Run in Supabase Dashboard > SQL Editor > New Query after 01_core_schema.sql.
-- Purpose: enable Row Level Security and define safe default read access.

do $$
declare
    table_name text;
begin
    foreach table_name in array array[
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
    ]
    loop
        execute format('alter table public.%I enable row level security', table_name);
    end loop;
end $$;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

grant usage on schema public to authenticated;

grant select on
    public.dim_locations,
    public.dim_products,
    public.dim_suppliers,
    public.supplier_products,
    public.dim_carriers,
    public.fact_purchase_orders,
    public.fact_customer_orders,
    public.fact_sales_demand,
    public.fact_inventory_snapshots,
    public.fact_shipments,
    public.model_registry,
    public.demand_forecasts,
    public.shipment_delay_predictions,
    public.supplier_performance_scores,
    public.inventory_recommendations,
    public.business_recommendations
to authenticated;

grant select on public.profiles to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

do $$
declare
    table_name text;
begin
    foreach table_name in array array[
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
    ]
    loop
        execute format('drop policy if exists authenticated_read on public.%I', table_name);
        execute format(
            'create policy authenticated_read on public.%I for select to authenticated using (true)',
            table_name
        );
    end loop;
end $$;

-- Intentionally no authenticated read policies are created for raw_source_files,
-- raw_source_records, etl_batch_runs, or data_quality_issues.
-- ETL and backend service-role operations can still access them server-side.
